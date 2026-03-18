'use client';

import { useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import {
    gregorianToHijri,
    formatHijriDate,
    getNextHijriAnniversary,
} from '@/lib/hijri-calendar';
import { Card, CardContent } from '@/components/ui/card';

interface HawlTrackerProps {
    anniversaryHijri?: string;
    baseCurrency: string;
}

export default function HawlTracker({ anniversaryHijri }: HawlTrackerProps) {
    const today = useMemo(() => new Date(), []);
    const currentHijri = useMemo(() => gregorianToHijri(today), [today]);
    const currentHijriFormatted = useMemo(() => formatHijriDate(currentHijri), [currentHijri]);

    const anniversary = useMemo(() => {
        if (!anniversaryHijri) return null;
        const [m, d] = anniversaryHijri.split('-').map(Number);
        if (!m || !d) return null;
        return getNextHijriAnniversary(m, d);
    }, [anniversaryHijri]);

    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const progress = useMemo(() => {
        if (!anniversary) return 0;
        const totalDays = 354;
        const daysPassed = totalDays - anniversary.daysRemaining;
        return Math.max(0, Math.min(1, daysPassed / totalDays));
    }, [anniversary]);

    const strokeDashoffset = circumference * (1 - progress);

    const targetGregorianFormatted = anniversary
        ? anniversary.gregorianDate.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : null;

    const targetHijriFormatted = anniversary
        ? formatHijriDate(anniversary.hijriDate)
        : null;

    if (!anniversaryHijri) {
        return (
            <Card className="transition-all hover:shadow-md">
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center">
                            <Calendar size={16} />
                        </div>
                        <h3 className="text-sm font-medium text-muted-foreground tracking-wide">
                            Hawl Anniversary
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground/80 mb-4 leading-relaxed">
                        Set your Zakat anniversary date in Settings to track your Hawl cycle.
                    </p>
                    <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Today in Hijri</p>
                        <p className="text-sm font-medium text-foreground">{currentHijriFormatted}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isUrgent = anniversary && anniversary.daysRemaining <= 30;
    const isImminent = anniversary && anniversary.daysRemaining <= 7;

    return (
        <Card className="transition-all hover:shadow-md">
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isImminent ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                        isUrgent ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                        'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                    }`}>
                        <Calendar size={16} />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground tracking-wide">
                        Hawl Anniversary
                    </h3>
                </div>

                {/* Progress Ring & Details */}
                <div className="flex items-center gap-6">
                    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
                        <svg width={size} height={size} className="transform -rotate-90">
                            {/* Track */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                className="stroke-secondary"
                                strokeWidth={strokeWidth}
                            />
                            {/* Progress */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={isImminent ? 'var(--color-destructive)' : isUrgent ? '#f59e0b' : 'var(--color-primary)'}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-bold tracking-tight ${
                                isImminent ? 'text-red-600 dark:text-red-400' :
                                isUrgent ? 'text-amber-600 dark:text-amber-400' :
                                'text-foreground'
                            }`}>
                                {anniversary?.daysRemaining ?? 0}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">days left</span>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-4">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Anniversary</p>
                            <p className="text-sm font-semibold text-foreground">{targetHijriFormatted}</p>
                            <p className="text-[11px] text-muted-foreground/80 mt-0.5">{targetGregorianFormatted}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Today (Hijri)</p>
                            <p className="text-sm font-medium text-foreground">{currentHijriFormatted}</p>
                        </div>
                    </div>
                </div>

                {/* Status badge */}
                {isImminent ? (
                    <div className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                        <Clock size={14} className="animate-pulse" />
                        Zakat due in {anniversary?.daysRemaining} days — prepare your calculation
                    </div>
                ) : isUrgent ? (
                    <div className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                        <Clock size={14} />
                        {anniversary?.daysRemaining} days remaining in your Hawl cycle
                    </div>
                ) : (
                    <div className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {Math.round(progress * 100)}% through your Hawl cycle
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
