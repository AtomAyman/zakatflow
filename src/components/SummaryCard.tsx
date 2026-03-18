'use client';

import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    accent?: 'emerald' | 'amber' | 'blue' | 'purple' | 'red';
    children?: ReactNode;
}

const accentColors = {
    emerald: {
        icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
        icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        text: 'text-amber-600 dark:text-amber-400',
    },
    blue: {
        icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        text: 'text-blue-600 dark:text-blue-400',
    },
    purple: {
        icon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        text: 'text-purple-600 dark:text-purple-400',
    },
    red: {
        icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
        text: 'text-red-600 dark:text-red-400',
    },
};

export default function SummaryCard({
    title,
    value,
    subtitle,
    icon: Icon,
    accent = 'emerald',
    children,
}: SummaryCardProps) {
    const colors = accentColors[accent];

    return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
                        <Icon size={20} className="stroke-[2.5]" />
                    </div>
                </div>

                <p className="text-sm font-medium text-muted-foreground tracking-wide mb-1">
                    {title}
                </p>
                <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
                {subtitle && (
                    <p className={`text-sm mt-1 font-medium ${colors.text}`}>{subtitle}</p>
                )}
                {children}
            </CardContent>
        </Card>
    );
}
