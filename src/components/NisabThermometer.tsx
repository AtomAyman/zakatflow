'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

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
        <Card className="relative overflow-hidden">
            <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground tracking-wide mb-1">
                    Nisab Thermometer
                </h3>
                <p className="text-sm text-muted-foreground/70 mb-8">
                    Based on {nisabStandard} standard
                </p>

                {/* Thermometer Bar */}
                <div className="relative mb-8">
                    <div className="h-4 rounded-full bg-secondary overflow-hidden relative border border-border">
                        {/* Fill */}
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isAboveNisab
                                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                    : 'bg-amber-500'
                                }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />

                        {/* Nisab line */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
                            style={{ left: `${nisabLinePos}%` }}
                        >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <div className="bg-background/90 backdrop-blur-xl rounded-md px-2 py-0.5 border border-border shadow-sm">
                                    <p className="text-[11px] text-foreground font-medium">
                                        Nisab: {formatCurrency(nisabThreshold)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Value label */}
                    <div className="flex justify-between mt-3">
                        <span className="text-sm text-muted-foreground">$0</span>
                        <span
                            className={`text-sm font-bold ${isAboveNisab ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                }`}
                        >
                            {formatCurrency(netZakatable)}
                        </span>
                    </div>
                </div>

                {/* Status badge */}
                <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${isAboveNisab
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                        }`}
                >
                    <div
                        className={`w-2 h-2 rounded-full ${isAboveNisab ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                    />
                    {isAboveNisab
                        ? 'Above Nisab — Zakat is obligatory'
                        : 'Below Nisab — Zakat not yet due'}
                </div>
            </CardContent>
        </Card>
    );
}
