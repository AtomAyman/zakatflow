'use client';

import { useState } from 'react';
import { useZakatStore } from '@/lib/store';
import { Calendar, CheckCircle2, Clock, ArrowRight, History, X, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import YearSelector from '@/components/YearSelector';

// ─── Approximate historical gold & silver per gram (USD) ──
// Used as defaults for past year nisab estimates
const HISTORICAL_GOLD_PER_GRAM: Record<string, number> = {
    '2020': 57.0, '2021': 58.0, '2022': 58.5, '2023': 63.5,
    '2024': 75.0, '2025': 88.0,
};
const HISTORICAL_SILVER_PER_GRAM: Record<string, number> = {
    '2020': 0.65, '2021': 0.82, '2022': 0.70, '2023': 0.76,
    '2024': 0.90, '2025': 1.05,
};

const GOLD_NISAB_GRAMS = 87.48;
const SILVER_NISAB_GRAMS = 612.36;

function getHistoricalNisab(year: string, standard: 'Gold' | 'Silver'): number | null {
    if (standard === 'Gold') {
        const price = HISTORICAL_GOLD_PER_GRAM[year];
        return price ? Math.round(price * GOLD_NISAB_GRAMS) : null;
    }
    const price = HISTORICAL_SILVER_PER_GRAM[year];
    return price ? Math.round(price * SILVER_NISAB_GRAMS) : null;
}

export default function HistoryPage() {
    const { history, dashboard, settings, selectedYear, setSelectedYear, getAssetsForYear, getLiabilitiesForYear, getYearsWithData, prices } = useZakatStore();
    const router = useRouter();
    const [showBackfill, setShowBackfill] = useState(false);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Finalize form state
    const [fNisab, setFNisab] = useState('');
    const [fZakatPaid, setFZakatPaid] = useState('');
    const [fRecipients, setFRecipients] = useState('');

    // Quick-add form state (for years with no asset data — just zakat paid)
    const [qaYear, setQaYear] = useState('');
    const [qaNisab, setQaNisab] = useState('');
    const [qaZakatPaid, setQaZakatPaid] = useState('');
    const [qaTotalAssets, setQaTotalAssets] = useState('');
    const [qaRecipients, setQaRecipients] = useState('');

    const currentYear = new Date().getFullYear();
    const START_YEAR = 2020;
    const availableYears = Array.from(
        { length: currentYear - START_YEAR },
        (_, i) => (currentYear - 1 - i).toString()
    );

    const yearsWithData = getYearsWithData();

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.baseCurrency || 'USD',
            maximumFractionDigits: 0,
        }).format(n);

    // ─── Open finalize modal ──────────────────────────────
    const openFinalizeModal = () => {
        // Pre-fill with live dashboard values for current year, or historical nisab for past years
        const isCurrentYear = selectedYear === currentYear.toString();
        let nisabDefault = dashboard.nisabThreshold;

        if (!isCurrentYear) {
            const historical = getHistoricalNisab(selectedYear, settings.nisabStandard);
            if (historical) nisabDefault = historical;
        }

        setFNisab(Math.round(nisabDefault).toString());
        setFZakatPaid(Math.round(dashboard.zakatDue).toString());
        setFRecipients('');
        setShowFinalizeModal(true);
    };

    // ─── Open quick-add modal ─────────────────────────────
    const openQuickAdd = () => {
        setQaYear(availableYears.find((y) => !history.some((h) => h.year === y)) || '2024');
        setQaNisab('');
        setQaZakatPaid('');
        setQaTotalAssets('');
        setQaRecipients('');
        setShowQuickAdd(true);
    };

    // Update nisab when quick-add year changes
    const handleQaYearChange = (year: string) => {
        setQaYear(year);
        const historical = getHistoricalNisab(year, settings.nisabStandard);
        if (historical) setQaNisab(historical.toString());
    };

    // ─── Finalize with editable values ────────────────────
    const handleFinalize = async () => {
        const nisab = Number(fNisab) || dashboard.nisabThreshold;
        const zakatPaid = Number(fZakatPaid) || dashboard.zakatDue;
        const netZakatable = dashboard.netZakatableWealth;

        const entry = {
            year: selectedYear,
            dateFinalized: new Date().toISOString().split('T')[0],
            totalAssets: dashboard.totalGrossAssets,
            totalLiabilities: dashboard.totalLiabilities,
            netZakatable,
            nisabThresholdUsed: nisab,
            zakatPaid,
            recipientsList: fRecipients,
        };

        useZakatStore.getState().setHistory([...history, entry]);
        setShowFinalizeModal(false);

        try {
            await fetch('/api/sheets/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
                },
                body: JSON.stringify(entry),
            });
        } catch (err) {
            console.error('Failed to save history:', err);
        }
    };

    // ─── Quick-add (no asset data needed) ─────────────────
    const handleQuickAdd = async () => {
        const entry = {
            year: qaYear,
            dateFinalized: new Date().toISOString().split('T')[0],
            totalAssets: Number(qaTotalAssets) || 0,
            totalLiabilities: 0,
            netZakatable: Number(qaTotalAssets) || 0,
            nisabThresholdUsed: Number(qaNisab) || 0,
            zakatPaid: Number(qaZakatPaid) || 0,
            recipientsList: qaRecipients,
        };

        useZakatStore.getState().setHistory([...history, entry]);
        setShowQuickAdd(false);

        try {
            await fetch('/api/sheets/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-spreadsheet-id': useZakatStore.getState().spreadsheetId || '',
                },
                body: JSON.stringify(entry),
            });
        } catch (err) {
            console.error('Failed to save history:', err);
        }
    };

    const handleBackfillYear = (year: string) => {
        setSelectedYear(year);
        setShowBackfill(false);
        router.push('/dashboard/assets');
    };

    // Check if selected year has any data
    const selectedYearAssets = getAssetsForYear(selectedYear);
    const selectedYearLiabilities = getLiabilitiesForYear(selectedYear);
    const selectedYearHasData = selectedYearAssets.length > 0 || selectedYearLiabilities.length > 0;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">History</h1>
                    <p className="text-sm text-white/40 mt-1">Year-by-year Zakat records</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                        onClick={openQuickAdd}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
                    >
                        <Edit3 size={13} />
                        Quick Add
                    </button>
                    <button
                        onClick={() => setShowBackfill(true)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
                    >
                        <History size={13} />
                        Backfill
                    </button>
                    <button
                        onClick={openFinalizeModal}
                        disabled={!selectedYearHasData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 size={14} />
                        Finalize {selectedYear}
                    </button>
                </div>
            </div>

            {/* Year selector + current year preview */}
            <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-emerald-400" />
                        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                            {selectedYear} (Live)
                        </h3>
                    </div>
                    <YearSelector showCopyPrompt={false} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-white/30 uppercase mb-0.5">Net Zakatable</p>
                        <p className="text-lg font-bold text-white">
                            {formatCurrency(dashboard.netZakatableWealth)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/30 uppercase mb-0.5">Zakat Due</p>
                        <p className="text-lg font-bold text-emerald-400">
                            {formatCurrency(dashboard.zakatDue)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/30 uppercase mb-0.5">Nisab ({settings.nisabStandard})</p>
                        <p className="text-sm text-white/60">
                            {formatCurrency(dashboard.nisabThreshold)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/30 uppercase mb-0.5">Assets / Liabilities</p>
                        <p className="text-sm text-white/60">
                            {selectedYearAssets.length} assets · {selectedYearLiabilities.length} debts
                        </p>
                    </div>
                </div>
                {!selectedYearHasData && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                        <p className="text-xs text-amber-300/70">
                            No data for {selectedYear} yet.
                            <button
                                onClick={() => {
                                    setSelectedYear(selectedYear);
                                    router.push('/dashboard/assets');
                                }}
                                className="ml-1 text-amber-400 underline hover:no-underline"
                            >
                                Add assets →
                            </button>
                        </p>
                    </div>
                )}
            </div>

            {/* Years with data overview */}
            {yearsWithData.length > 0 && (
                <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-5">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                        Years with Data
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {yearsWithData.map((year) => {
                            const assetCount = getAssetsForYear(year).length;
                            const liabilityCount = getLiabilitiesForYear(year).length;
                            const isFinalized = history.some((h) => h.year === year);
                            return (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${year === selectedYear
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                        : 'bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-white/[0.08]'
                                        }`}
                                >
                                    <span className="font-semibold">{year}</span>
                                    <span className="ml-2 text-white/30">
                                        {assetCount}A · {liabilityCount}L
                                        {isFinalized && ' ✓'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* History entries */}
            {history.length > 0 ? (
                <div className="space-y-3">
                    {[...history].reverse().map((entry, i) => (
                        <div
                            key={i}
                            className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-5"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                    <Calendar size={14} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">{entry.year}</p>
                                    <p className="text-[10px] text-white/30">
                                        Finalized: {entry.dateFinalized}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedYear(entry.year);
                                        router.push('/dashboard/assets');
                                    }}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-all"
                                >
                                    View assets <ArrowRight size={10} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-white/30 mb-0.5">Total Assets</p>
                                    <p className="text-white/70 font-medium">
                                        {formatCurrency(entry.totalAssets)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-white/30 mb-0.5">Liabilities</p>
                                    <p className="text-white/70 font-medium">
                                        {formatCurrency(entry.totalLiabilities)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-white/30 mb-0.5">Nisab Used</p>
                                    <p className="text-white/70 font-medium">
                                        {formatCurrency(entry.nisabThresholdUsed)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-white/30 mb-0.5">Zakat Paid</p>
                                    <p className="text-emerald-400 font-bold">
                                        {formatCurrency(entry.zakatPaid)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] border-dashed p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <Calendar size={24} className="text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white/70 mb-2">
                        No finalized years yet
                    </h3>
                    <p className="text-sm text-white/30 max-w-sm mx-auto">
                        When you finalize a year&apos;s calculation, it will be saved here. Use &quot;Quick Add&quot; to record past years with just the zakat amount.
                    </p>
                </div>
            )}

            {/* ─── Finalize Confirmation Modal ──────────────── */}
            {showFinalizeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFinalizeModal(false)} />
                    <div className="relative w-full max-w-md rounded-2xl bg-[#1a1d27] border border-white/[0.08] shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-white">Finalize {selectedYear}</h2>
                            <button onClick={() => setShowFinalizeModal(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/40">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-white/30 mb-0.5">Total Assets</p>
                                    <p className="text-white/70 font-medium">{formatCurrency(dashboard.totalGrossAssets)}</p>
                                </div>
                                <div>
                                    <p className="text-white/30 mb-0.5">Net Zakatable</p>
                                    <p className="text-white/70 font-medium">{formatCurrency(dashboard.netZakatableWealth)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Nisab — editable */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">
                                    Nisab Threshold ({settings.nisabStandard})
                                    {selectedYear !== currentYear.toString() && (
                                        <span className="ml-2 text-amber-400/60">
                                            — auto-filled with ~{selectedYear} avg
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    value={fNisab}
                                    onChange={(e) => setFNisab(e.target.value)}
                                    placeholder="Enter nisab value"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                                <p className="text-[10px] text-white/20 mt-1">
                                    {settings.nisabStandard === 'Gold'
                                        ? `Gold nisab = 87.48g × price/g at time of calculation`
                                        : `Silver nisab = 612.36g × price/g at time of calculation`}
                                </p>
                            </div>

                            {/* Zakat Paid — editable */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Zakat Paid / Due</label>
                                <input
                                    type="number"
                                    value={fZakatPaid}
                                    onChange={(e) => setFZakatPaid(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            {/* Recipients — optional */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Recipients (optional)</label>
                                <input
                                    type="text"
                                    value={fRecipients}
                                    onChange={(e) => setFRecipients(e.target.value)}
                                    placeholder="e.g. Local masjid, relatives"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            <button
                                onClick={handleFinalize}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98]"
                            >
                                Finalize {selectedYear}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Quick Add History Modal ──────────────────── */}
            {showQuickAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickAdd(false)} />
                    <div className="relative w-full max-w-md rounded-2xl bg-[#1a1d27] border border-white/[0.08] shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-base font-semibold text-white">Quick Add History</h2>
                            <button onClick={() => setShowQuickAdd(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/40">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-white/30 mb-5">
                            Record a past year&apos;s zakat without needing to enter individual assets.
                        </p>

                        <div className="space-y-4">
                            {/* Year */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Year</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {availableYears.slice(0, 5).map((y) => {
                                        const isFinalized = history.some((h) => h.year === y);
                                        return (
                                            <button
                                                key={y}
                                                type="button"
                                                onClick={() => handleQaYearChange(y)}
                                                disabled={isFinalized}
                                                className={`px-2 py-2 rounded-xl text-xs font-medium transition-all ${qaYear === y
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                    : isFinalized
                                                        ? 'bg-white/[0.02] text-white/20 border border-white/[0.04] cursor-not-allowed'
                                                        : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'
                                                    }`}
                                            >
                                                {y}
                                                {isFinalized && <span className="block text-[8px] text-white/20">done</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Nisab */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">
                                    Nisab Threshold ({settings.nisabStandard})
                                    {qaNisab && (
                                        <span className="ml-2 text-amber-400/60">
                                            — auto-filled with ~{qaYear} avg
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    value={qaNisab}
                                    onChange={(e) => setQaNisab(e.target.value)}
                                    placeholder="Enter nisab value for that year"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            {/* Total Assets (optional) */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Total Assets (optional)</label>
                                <input
                                    type="number"
                                    value={qaTotalAssets}
                                    onChange={(e) => setQaTotalAssets(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            {/* Zakat Paid */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Zakat Paid</label>
                                <input
                                    type="number"
                                    value={qaZakatPaid}
                                    onChange={(e) => setQaZakatPaid(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            {/* Recipients */}
                            <div>
                                <label className="block text-xs text-white/40 mb-2">Recipients (optional)</label>
                                <input
                                    type="text"
                                    value={qaRecipients}
                                    onChange={(e) => setQaRecipients(e.target.value)}
                                    placeholder="e.g. Local masjid, relatives"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-sm focus:outline-none focus:border-emerald-500/40 transition-all"
                                />
                            </div>

                            <button
                                onClick={handleQuickAdd}
                                disabled={!qaYear || !qaZakatPaid}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Add {qaYear} History
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Backfill modal */}
            {showBackfill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBackfill(false)} />
                    <div className="relative w-full max-w-sm rounded-2xl bg-[#1a1d27] border border-white/[0.08] shadow-2xl p-6">
                        <h3 className="text-base font-semibold text-white mb-2">
                            Backfill a Previous Year
                        </h3>
                        <p className="text-xs text-white/40 mb-5">
                            Select a year to add or edit its assets and liabilities. You&apos;ll be taken to the Assets page for that year.
                        </p>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {availableYears.map((year) => {
                                const hasData = yearsWithData.includes(year);
                                const isFinalized = history.some((h) => h.year === year);
                                return (
                                    <button
                                        key={year}
                                        onClick={() => handleBackfillYear(year)}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white/70 hover:bg-white/[0.08] transition-all"
                                    >
                                        <span className="font-medium">{year}</span>
                                        <div className="flex items-center gap-2">
                                            {hasData && (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px] text-emerald-400">
                                                    Has data
                                                </span>
                                            )}
                                            {isFinalized && (
                                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] text-blue-400">
                                                    Finalized
                                                </span>
                                            )}
                                            <ArrowRight size={12} className="text-white/30" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowBackfill(false)}
                            className="w-full mt-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/50 text-xs font-medium hover:bg-white/[0.08] transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
