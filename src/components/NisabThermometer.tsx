'use client';

import { useMemo } from 'react';

interface NisabThermometerProps {
    netZakatable: number;
    nisabThreshold: number;
    nisabStandard: 'Gold' | 'Silver';
}

export default function NisabThermometer({
    netZakatable,
    nisabThreshold,
    nisabStandard,
}: NisabThermometerProps) {
    const percentage = useMemo(() => {
        if (nisabThreshold <= 0) return 0;
        return Math.min((netZakatable / nisabThreshold) * 100, 150);
    }, [netZakatable, nisabThreshold]);

    const isAboveNisab = netZakatable >= nisabThreshold;
    const nisabLinePos = Math.min(100, (nisabThreshold / Math.max(netZakatable, nisabThreshold)) * 100);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(n);

    return (
        <div className="relative rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">
                Nisab Thermometer
            </h3>
            <p className="text-xs text-white/30 mb-6">
                Based on {nisabStandard} standard
            </p>

            {/* Thermometer Bar */}
            <div className="relative mb-8">
                <div className="h-6 rounded-full bg-white/[0.06] overflow-hidden relative">
                    {/* Fill */}
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isAboveNisab
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30'
                                : 'bg-gradient-to-r from-amber-500/60 to-amber-400/60'
                            }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    >
                        {/* Shine */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                    </div>

                    {/* Nisab line */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                        style={{ left: `${nisabLinePos}%` }}
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <div className="bg-white/10 backdrop-blur-xl rounded-lg px-2 py-1 border border-white/10">
                                <p className="text-[10px] text-white/70 font-medium">
                                    Nisab: {formatCurrency(nisabThreshold)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Value label */}
                <div className="flex justify-between mt-3">
                    <span className="text-xs text-white/40">$0</span>
                    <span
                        className={`text-sm font-bold ${isAboveNisab ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                    >
                        {formatCurrency(netZakatable)}
                    </span>
                </div>
            </div>

            {/* Status badge */}
            <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${isAboveNisab
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    }`}
            >
                <div
                    className={`w-2 h-2 rounded-full ${isAboveNisab ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                />
                {isAboveNisab
                    ? 'Above Nisab — Zakat is obligatory'
                    : 'Below Nisab — Zakat not yet due'}
            </div>
        </div>
    );
}
