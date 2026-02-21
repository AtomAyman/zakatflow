'use client';

import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

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
        bg: 'from-emerald-500/20 to-emerald-600/5',
        icon: 'from-emerald-400 to-emerald-600',
        shadow: 'shadow-emerald-500/10',
        text: 'text-emerald-400',
        glow: 'bg-emerald-500/20',
    },
    amber: {
        bg: 'from-amber-500/20 to-amber-600/5',
        icon: 'from-amber-400 to-amber-600',
        shadow: 'shadow-amber-500/10',
        text: 'text-amber-400',
        glow: 'bg-amber-500/20',
    },
    blue: {
        bg: 'from-blue-500/20 to-blue-600/5',
        icon: 'from-blue-400 to-blue-600',
        shadow: 'shadow-blue-500/10',
        text: 'text-blue-400',
        glow: 'bg-blue-500/20',
    },
    purple: {
        bg: 'from-purple-500/20 to-purple-600/5',
        icon: 'from-purple-400 to-purple-600',
        shadow: 'shadow-purple-500/10',
        text: 'text-purple-400',
        glow: 'bg-purple-500/20',
    },
    red: {
        bg: 'from-red-500/20 to-red-600/5',
        icon: 'from-red-400 to-red-600',
        shadow: 'shadow-red-500/10',
        text: 'text-red-400',
        glow: 'bg-red-500/20',
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
        <div
            className={`relative overflow-hidden rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6 transition-all duration-300 hover:border-white/[0.12] hover:shadow-lg ${colors.shadow} group`}
        >
            {/* Glow effect */}
            <div
                className={`absolute -top-12 -right-12 w-32 h-32 ${colors.glow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
            />

            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.icon} flex items-center justify-center shadow-lg ${colors.shadow}`}
                    >
                        <Icon size={18} className="text-white" />
                    </div>
                </div>

                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">
                    {title}
                </p>
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                {subtitle && (
                    <p className={`text-xs mt-1 ${colors.text}`}>{subtitle}</p>
                )}
                {children}
            </div>
        </div>
    );
}
