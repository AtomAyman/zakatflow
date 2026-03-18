'use client';

import { useZakatStore } from '@/lib/store';
import { ChevronDown, Calendar } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface YearSelectorProps {
    /** Whether to show the "Copy from..." prompt when landing on an empty year */
    showCopyPrompt?: boolean;
}

const START_YEAR = 2020;

export default function YearSelector({ showCopyPrompt = true }: YearSelectorProps) {
    const {
        selectedYear,
        setSelectedYear,
        getAssetsForYear,
        getLiabilitiesForYear,
        getYearsWithData,
        copyYearData,
    } = useZakatStore();

    const [open, setOpen] = useState(false);
    const [showCopy, setShowCopy] = useState(false);
    const [copyFromYear, setCopyFromYear] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    const currentYear = new Date().getFullYear();
    const years = Array.from(
        { length: currentYear - START_YEAR + 1 },
        (_, i) => (currentYear - i).toString()
    );
    const yearsWithData = getYearsWithData();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelectYear = (year: string) => {
        setOpen(false);
        const hasData = getAssetsForYear(year).length > 0 || getLiabilitiesForYear(year).length > 0;

        if (!hasData && showCopyPrompt && yearsWithData.length > 0 && year !== selectedYear) {
            setCopyFromYear(yearsWithData[0] === year && yearsWithData.length > 1 ? yearsWithData[1] : yearsWithData[0]);
            setShowCopy(true);
        }

        setSelectedYear(year);
    };

    const handleCopy = () => {
        copyYearData(copyFromYear, selectedYear);
        setShowCopy(false);
    };

    return (
        <>
            <div ref={ref} className="relative inline-flex">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground hover:bg-secondary/50 transition-all shadow-sm"
                >
                    <Calendar size={14} className="text-muted-foreground" />
                    <span className="font-medium">{selectedYear}</span>
                    <ChevronDown size={12} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute top-full mt-1 right-0 z-50 w-36 max-h-52 overflow-y-auto rounded-xl bg-card border border-border shadow-2xl py-1">
                        {years.map((yr) => {
                            const hasData = yearsWithData.includes(yr);
                            return (
                                <button
                                    key={yr}
                                    onClick={() => handleSelectYear(yr)}
                                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-all ${yr === selectedYear
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    <span>{yr}</span>
                                    {hasData && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Copy prompt modal */}
            {showCopy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowCopy(false)} />
                    <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6">
                        <h3 className="text-base font-semibold text-foreground mb-2">
                            No data for {selectedYear}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-5 font-medium leading-relaxed">
                            Would you like to copy your assets and liabilities from a previous year as a starting point?
                        </p>

                        <div className="mb-4">
                            <label className="block text-xs text-muted-foreground mb-2 font-medium">Copy from</label>
                            <select
                                value={copyFromYear}
                                onChange={(e) => setCopyFromYear(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all font-medium"
                            >
                                {yearsWithData.map((yr) => (
                                    <option key={yr} value={yr}>{yr}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCopy(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-all"
                            >
                                Start Fresh
                            </button>
                            <button
                                onClick={handleCopy}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                            >
                                Copy Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
