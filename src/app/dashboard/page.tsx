'use client';

import { useZakatStore } from '@/lib/store';
import SummaryCard from '@/components/SummaryCard';
import NisabThermometer from '@/components/NisabThermometer';
import NisabCard from '@/components/NisabCard';
import HawlTracker from '@/components/HawlTracker';
import {
    DollarSign,
    TrendingUp,
    Target,
    Coins,
    Plus,
    History,
} from 'lucide-react';
import Link from 'next/link';
import YearSelector from '@/components/YearSelector';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

export default function DashboardPage() {
    const { dashboard, settings, assets, prices, isLoading, selectedYear, getAssetsForYear } = useZakatStore();
    const yearAssets = getAssetsForYear(selectedYear);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.baseCurrency || 'USD',
            maximumFractionDigits: 0,
        }).format(n);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="space-y-4 text-center">
                    <div className="w-10 h-10 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-medium text-muted-foreground">Crunching numbers…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        {selectedYear}
                        <span className="w-1 h-1 rounded-full bg-border" />
                        {settings.madhab}
                        <span className="w-1 h-1 rounded-full bg-border" />
                        {settings.calculationBasis}
                        <span className="w-1 h-1 rounded-full bg-border" />
                        {(dashboard.zakatRate * 100).toFixed(settings.calculationBasis === 'Gregorian' ? 3 : 1)}%
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <YearSelector showCopyPrompt={false} />
                    <Link
                        href="/dashboard/assets"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Add Asset
                    </Link>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Net Worth"
                    value={formatCurrency(dashboard.totalGrossAssets)}
                    subtitle={`${assets.length} asset${assets.length !== 1 ? 's' : ''}`}
                    icon={DollarSign}
                    accent="blue"
                />
                <SummaryCard
                    title="Zakatable Wealth"
                    value={formatCurrency(dashboard.netZakatableWealth)}
                    subtitle={
                        dashboard.totalDeductions > 0
                            ? `After ${formatCurrency(dashboard.totalDeductions)} deductions`
                            : undefined
                    }
                    icon={TrendingUp}
                    accent="purple"
                />
                <SummaryCard
                    title="Nisab Threshold"
                    value={formatCurrency(dashboard.nisabThreshold)}
                    subtitle={`${settings.nisabStandard} standard`}
                    icon={Target}
                    accent="amber"
                />
                <SummaryCard
                    title="Zakat Due"
                    value={formatCurrency(dashboard.zakatDue)}
                    subtitle={
                        dashboard.isAboveNisab
                            ? '✓ Above Nisab'
                            : 'Below Nisab — Not due'
                    }
                    icon={Coins}
                    accent="emerald"
                />
            </div>

            {/* Live prices bar */}
            {prices.lastUpdated && (
                <div className="rounded-lg bg-secondary/50 border border-border px-5 py-3 flex items-center justify-between text-sm">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <span className="font-medium text-muted-foreground uppercase tracking-wider text-[11px]">Live Market</span>
                        <div className="flex items-center gap-4">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Gold: ${prices.goldPerGram.toFixed(2)}<span className="text-muted-foreground">/g</span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                Silver: ${prices.silverPerGram.toFixed(2)}<span className="text-muted-foreground">/g</span>
                            </span>
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                        Updated {new Date(prices.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )}

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column — Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Nisab thermometer */}
                    <NisabThermometer
                        netZakatable={dashboard.netZakatableWealth}
                        nisabThreshold={dashboard.nisabThreshold}
                        nisabStandard={settings.nisabStandard}
                    />

                    {/* Asset breakdown */}
                    {dashboard.assetBreakdown.length > 0 && (
                        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 overflow-hidden">
                            <h3 className="text-sm font-medium text-muted-foreground tracking-wide mb-6">
                                Asset Breakdown
                            </h3>
                            <div className="flex flex-col sm:flex-row items-center gap-8">
                                <div className="w-56 h-56 relative -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dashboard.assetBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={95}
                                                paddingAngle={4}
                                                stroke="none"
                                                dataKey="value"
                                            >
                                                {dashboard.assetBreakdown.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'var(--color-card)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    color: 'var(--color-foreground)',
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                                }}
                                                itemStyle={{ color: 'var(--color-foreground)', fontWeight: 500 }}
                                                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 space-y-4 w-full sm:w-auto">
                                    {dashboard.assetBreakdown.map((entry) => (
                                        <div key={entry.type} className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full shadow-sm"
                                                    style={{ backgroundColor: entry.color }}
                                                />
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {entry.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <span className="text-sm font-semibold text-foreground">
                                                {formatCurrency(entry.value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {assets.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Plus size={28} className="text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                Add your first asset
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
                                Start by adding your cash, bank accounts, investments, or gold to calculate your Zakat obligation.
                            </p>
                            <Link
                                href="/dashboard/assets"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                <Plus size={18} />
                                Add Assets
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right column — Nisab Card, Hawl Tracker, Details & Actions */}
                <div className="space-y-6">
                    {/* Nisab sparkline card */}
                    <NisabCard
                        nisabThreshold={dashboard.nisabThreshold}
                        nisabStandard={settings.nisabStandard}
                        isAboveNisab={dashboard.isAboveNisab}
                        netZakatableWealth={dashboard.netZakatableWealth}
                        baseCurrency={settings.baseCurrency}
                    />

                    {/* Hawl Anniversary Tracker */}
                    <HawlTracker
                        anniversaryHijri={settings.anniversaryHijri}
                        baseCurrency={settings.baseCurrency}
                    />

                    {/* Calculation summary */}
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-sm font-medium text-muted-foreground tracking-wide mb-5">
                            Calculation Details
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                <span className="text-muted-foreground">Gross Assets</span>
                                <span className="font-semibold text-foreground">{formatCurrency(dashboard.totalGrossAssets)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                <span className="text-muted-foreground">Exempt / Deductions</span>
                                <span className="font-semibold text-destructive">−{formatCurrency(dashboard.totalDeductions)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                <span className="text-muted-foreground">Net Zakatable Assets</span>
                                <span className="font-semibold text-foreground">{formatCurrency(dashboard.totalNetZakatableAssets)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                <span className="text-muted-foreground">Liability Deduction ({settings.madhab})</span>
                                <span className="font-semibold text-destructive">−{formatCurrency(dashboard.liabilityDeduction)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-medium text-foreground">Net Zakatable</span>
                                <span className="font-bold text-foreground text-base">{formatCurrency(dashboard.netZakatableWealth)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-border/50">
                                <span className="font-medium text-muted-foreground">× Rate</span>
                                <span className="font-bold text-primary">{(dashboard.zakatRate * 100).toFixed(3)}%</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-bold text-foreground text-base tracking-tight">Zakat Due</span>
                                <span className="font-black text-2xl text-primary">{formatCurrency(dashboard.zakatDue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="pt-2">
                        <Link
                            href="/dashboard/history"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors"
                        >
                            <History size={16} className="text-muted-foreground" />
                            View Past Calculations
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
