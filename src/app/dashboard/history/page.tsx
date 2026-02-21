'use client';

import { useState } from 'react';
import { useZakatStore } from '@/lib/store';
import { Calendar, CheckCircle2, Clock, ArrowRight, Plus, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import YearSelector from '@/components/YearSelector';

export default function HistoryPage() {
    const { history, dashboard, settings, selectedYear, setSelectedYear, getAssetsForYear, getLiabilitiesForYear, getYearsWithData } = useZakatStore();
    const router = useRouter();
    const [showBackfill, setShowBackfill] = useState(false);

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

    const handleFinalize = async () => {
        const entry = {
            year: selectedYear,
            dateFinalized: new Date().toISOString().split('T')[0],
            totalAssets: dashboard.totalGrossAssets,
            totalLiabilities: dashboard.totalLiabilities,
            netZakatable: dashboard.netZakatableWealth,
            nisabThresholdUsed: dashboard.nisabThreshold,
            zakatPaid: dashboard.zakatDue,
            recipientsList: '',
        };

        useZakatStore.getState().setHistory([...history, entry]);

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
                    <p className="text-sm text-white/40 mt-1">
                        Year-by-year Zakat records
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBackfill(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
                    >
                        <History size={14} />
                        Backfill Year
                    </button>
                    <button
                        onClick={handleFinalize}
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
                        <p className="text-[10px] text-white/30 uppercase mb-0.5">
                            Assets / Liabilities
                        </p>
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
                                    <p className="text-white/30 mb-0.5">Net Zakatable</p>
                                    <p className="text-white/70 font-medium">
                                        {formatCurrency(entry.netZakatable)}
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
                        When you finalize a year&apos;s calculation, it will be saved here. Use &quot;Backfill Year&quot; to add past data.
                    </p>
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
