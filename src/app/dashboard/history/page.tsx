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
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <History size={24} className="text-blue-500" />
                        History
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground">Year-by-year Zakat records</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap sm:justify-end">
                    <button
                        onClick={openQuickAdd}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
                    >
                        <Edit3 size={16} />
                        Quick Add
                    </button>
                    <button
                        onClick={() => setShowBackfill(true)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
                    >
                        <History size={16} />
                        Backfill
                    </button>
                    <button
                        onClick={openFinalizeModal}
                        disabled={!selectedYearHasData}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 size={16} />
                        Finalize {selectedYear}
                    </button>
                </div>
            </div>

            {/* Year selector + current year preview */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-emerald-600 dark:text-emerald-500" />
                        <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">
                            {selectedYear} (Live)
                        </h3>
                    </div>
                    <YearSelector showCopyPrompt={false} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Net Zakatable</p>
                        <p className="text-xl font-bold text-foreground">
                            {formatCurrency(dashboard.netZakatableWealth)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Zakat Due</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500">
                            {formatCurrency(dashboard.zakatDue)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Nisab ({settings.nisabStandard})</p>
                        <p className="text-base font-medium text-muted-foreground">
                            {formatCurrency(dashboard.nisabThreshold)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Assets / Debt</p>
                        <p className="text-base font-medium text-muted-foreground">
                            {selectedYearAssets.length} assets · {selectedYearLiabilities.length} debts
                        </p>
                    </div>
                </div>
                {!selectedYearHasData && (
                    <div className="mt-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-500 flex items-center gap-2">
                            <span>No data for {selectedYear} yet.</span>
                            <button
                                onClick={() => {
                                    setSelectedYear(selectedYear);
                                    router.push('/dashboard/assets');
                                }}
                                className="underline hover:no-underline underline-offset-2"
                            >
                                Add assets &rarr;
                            </button>
                        </p>
                    </div>
                )}
            </div>

            {/* Years with data overview */}
            {yearsWithData.length > 0 && (
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
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
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all border ${year === selectedYear
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                        : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
                                        }`}
                                >
                                    <span className="font-semibold">{year}</span>
                                    <span className={`ml-2 text-xs ${year === selectedYear ? 'opacity-80' : 'text-muted-foreground'}`}>
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
                <div className="space-y-4">
                    {[...history].reverse().map((entry, i) => (
                        <div
                            key={i}
                            className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6"
                        >
                            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={20} className="text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-bold text-foreground">{entry.year}</p>
                                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                        Finalized: {new Date(entry.dateFinalized).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedYear(entry.year);
                                        router.push('/dashboard/assets');
                                    }}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                >
                                    View assets <ArrowRight size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Assets</p>
                                    <p className="text-base font-semibold text-foreground">
                                        {formatCurrency(entry.totalAssets)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Liabilities</p>
                                    <p className="text-base font-semibold text-foreground">
                                        {formatCurrency(entry.totalLiabilities)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Nisab Used</p>
                                    <p className="text-base font-semibold text-foreground">
                                        {formatCurrency(entry.nisabThresholdUsed)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 mb-1">Zakat Paid</p>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
                                        {formatCurrency(entry.zakatPaid)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <Calendar size={28} className="text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No finalized years yet
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                        When you finalize a year's calculation, it will be saved here. Use "Quick Add" to record past years with just the zakat amount.
                    </p>
                </div>
            )}

            {/* ─── Finalize Confirmation Modal ──────────────── */}
            {showFinalizeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowFinalizeModal(false)} />
                    <div className="relative w-full max-w-md rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-foreground">Finalize {selectedYear}</h2>
                            <button onClick={() => setShowFinalizeModal(false)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="rounded-lg bg-secondary/50 border border-border p-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Gross Assets</p>
                                    <p className="text-sm font-semibold text-foreground">{formatCurrency(dashboard.totalGrossAssets)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Net Zakatable</p>
                                    <p className="text-sm font-semibold text-foreground">{formatCurrency(dashboard.netZakatableWealth)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Nisab — editable */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Nisab Threshold ({settings.nisabStandard})
                                    {selectedYear !== currentYear.toString() && (
                                        <span className="ml-2 text-amber-600 dark:text-amber-500 text-xs">
                                            — auto-filled with ~{selectedYear} avg
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    value={fNisab}
                                    onChange={(e) => setFNisab(e.target.value)}
                                    placeholder="Enter nisab value"
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    {settings.nisabStandard === 'Gold'
                                        ? `Gold nisab = 87.48g × price/g at time of calculation`
                                        : `Silver nisab = 612.36g × price/g at time of calculation`}
                                </p>
                            </div>

                            {/* Zakat Paid — editable */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Zakat Paid / Due</label>
                                <input
                                    type="number"
                                    value={fZakatPaid}
                                    onChange={(e) => setFZakatPaid(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Recipients — optional */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Recipients (optional)</label>
                                <input
                                    type="text"
                                    value={fRecipients}
                                    onChange={(e) => setFRecipients(e.target.value)}
                                    placeholder="e.g. Local masjid, relatives"
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <button
                                onClick={handleFinalize}
                                className="w-full mt-4 py-2.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
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
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowQuickAdd(false)} />
                    <div className="relative w-full max-w-md rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-foreground">Quick Add History</h2>
                            <button onClick={() => setShowQuickAdd(false)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-6">
                            Record a past year's zakat without needing to enter individual assets.
                        </p>

                        <div className="space-y-5">
                            {/* Year */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Year</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {availableYears.slice(0, 5).map((y) => {
                                        const isFinalized = history.some((h) => h.year === y);
                                        return (
                                            <button
                                                key={y}
                                                type="button"
                                                onClick={() => handleQaYearChange(y)}
                                                disabled={isFinalized}
                                                className={`px-2 py-2 rounded-lg text-sm font-medium transition-all border ${qaYear === y
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                                                    : isFinalized
                                                        ? 'bg-secondary/50 text-muted-foreground opacity-50 cursor-not-allowed border-transparent'
                                                        : 'bg-background text-foreground border-border hover:bg-secondary/50'
                                                    }`}
                                            >
                                                {y}
                                                {isFinalized && <span className="block text-[9px] mt-0.5 opacity-70">done</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Nisab */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Nisab Threshold ({settings.nisabStandard})
                                    {qaNisab && (
                                        <span className="ml-2 text-amber-600 dark:text-amber-500 text-xs">
                                            — auto-filled with ~{qaYear} avg
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    value={qaNisab}
                                    onChange={(e) => setQaNisab(e.target.value)}
                                    placeholder="Enter nisab value for that year"
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Total Assets (optional) */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Total Assets (optional)</label>
                                <input
                                    type="number"
                                    value={qaTotalAssets}
                                    onChange={(e) => setQaTotalAssets(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Zakat Paid */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Zakat Paid</label>
                                <input
                                    type="number"
                                    value={qaZakatPaid}
                                    onChange={(e) => setQaZakatPaid(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Recipients */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Recipients (optional)</label>
                                <input
                                    type="text"
                                    value={qaRecipients}
                                    onChange={(e) => setQaRecipients(e.target.value)}
                                    placeholder="e.g. Local masjid, relatives"
                                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <button
                                onClick={handleQuickAdd}
                                disabled={!qaYear || !qaZakatPaid}
                                className="w-full mt-4 py-2.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowBackfill(false)} />
                    <div className="relative w-full max-w-sm rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-foreground">
                                Backfill a Previous Year
                            </h3>
                            <button onClick={() => setShowBackfill(false)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-6">
                            Select a year to add or edit its assets and liabilities. You'll be taken to the Assets page for that year.
                        </p>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {availableYears.map((year) => {
                                const hasData = yearsWithData.includes(year);
                                const isFinalized = history.some((h) => h.year === year);
                                return (
                                    <button
                                        key={year}
                                        onClick={() => handleBackfillYear(year)}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-background border border-border text-sm font-medium text-foreground hover:bg-secondary/50 transition-all"
                                    >
                                        <span>{year}</span>
                                        <div className="flex items-center gap-2">
                                            {hasData && (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                    Has data
                                                </span>
                                            )}
                                            {isFinalized && (
                                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                    Finalized
                                                </span>
                                            )}
                                            <ArrowRight size={14} className="text-muted-foreground" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
