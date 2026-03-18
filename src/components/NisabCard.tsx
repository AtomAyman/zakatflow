'use client';

import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    Tooltip,
    YAxis,
} from 'recharts';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface NisabCardProps {
    nisabThreshold: number;
    nisabStandard: 'Gold' | 'Silver';
    isAboveNisab: boolean;
    netZakatableWealth: number;
    baseCurrency: string;
}

// Approximate quarterly Nisab values
const QUARTERLY_GOLD_NISAB = [
    { quarter: 'Q1 2025', value: 5687 },
    { quarter: 'Q2 2025', value: 6234 },
    { quarter: 'Q3 2025', value: 6891 },
    { quarter: 'Q4 2025', value: 7350 },
    { quarter: 'Q1 2026', value: 7698 },
];

const QUARTERLY_SILVER_NISAB = [
    { quarter: 'Q1 2025', value: 398 },
    { quarter: 'Q2 2025', value: 422 },
    { quarter: 'Q3 2025', value: 465 },
    { quarter: 'Q4 2025', value: 510 },
    { quarter: 'Q1 2026', value: 643 },
];

export default function NisabCard({
    nisabThreshold,
    nisabStandard,
    isAboveNisab,
    netZakatableWealth,
    baseCurrency,
}: NisabCardProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: baseCurrency || 'USD',
            maximumFractionDigits: 0,
        }).format(n);

    const chartData = useMemo(() => {
        const raw = nisabStandard === 'Gold' ? QUARTERLY_GOLD_NISAB : QUARTERLY_SILVER_NISAB;
        return raw.map((d, i) =>
            i === raw.length - 1 ? { ...d, value: Math.round(nisabThreshold) } : d
        );
    }, [nisabStandard, nisabThreshold]);

    const trend = useMemo(() => {
        if (chartData.length < 2) return 0;
        const prev = chartData[chartData.length - 2].value;
        const curr = chartData[chartData.length - 1].value;
        return ((curr - prev) / prev) * 100;
    }, [chartData]);

    const minValue = Math.min(...chartData.map((d) => d.value));
    const maxValue = Math.max(...chartData.map((d) => d.value));

    // Dynamic chart color based on theme
    const chartColor = isDark ? '#fbbf24' : '#d97706'; // amber-400 vs amber-600

    return (
        <Card className="transition-all hover:shadow-md">
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center">
                            <Target size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground tracking-wide">
                                Nisab Threshold
                            </h3>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${trend >= 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                        {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                </div>

                {/* Value */}
                <p className="text-3xl font-bold tracking-tight text-foreground mb-1">
                    {formatCurrency(nisabThreshold)}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                    {nisabStandard === 'Gold' ? '87.48g gold' : '612.36g silver'} · Live
                </p>

                {/* Sparkline */}
                <div className="h-24 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                            <defs>
                                <linearGradient id="nisabGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <YAxis domain={[minValue * 0.95, maxValue * 1.05]} hide />
                            <Tooltip
                                contentStyle={{
                                    background: isDark ? '#1a1d27' : '#ffffff',
                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: isDark ? '#e2e8f0' : '#0f172a',
                                    padding: '8px 12px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value: number) => [formatCurrency(value), 'Nisab']}
                                labelStyle={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: '11px', marginBottom: '4px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={chartColor}
                                strokeWidth={2}
                                fill="url(#nisabGrad)"
                                dot={false}
                                activeDot={{ r: 4, fill: chartColor, stroke: isDark ? '#1a1d27' : '#ffffff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <p className="text-[11px] text-muted-foreground/70 mt-2 text-center uppercase tracking-wider font-medium">
                    Quarterly Nisab History ({nisabStandard})
                </p>

                {/* Status */}
                <div className={`mt-6 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${isAboveNisab
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isAboveNisab ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`} />
                    {isAboveNisab
                        ? `Wealth ${formatCurrency(netZakatableWealth)} exceeds Nisab`
                        : `${formatCurrency(nisabThreshold - netZakatableWealth)} below Nisab`}
                </div>
            </CardContent>
        </Card>
    );
}
