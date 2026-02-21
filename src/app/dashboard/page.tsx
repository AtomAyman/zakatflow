'use client';

import { useZakatStore } from '@/lib/store';
import SummaryCard from '@/components/SummaryCard';
import NisabThermometer from '@/components/NisabThermometer';
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
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {selectedYear} · {settings.madhab} · {settings.calculationBasis} ·{' '}
                        {(dashboard.zakatRate * 100).toFixed(settings.calculationBasis === 'Gregorian' ? 3 : 1)}
                        % · {settings.baseCurrency}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <YearSelector showCopyPrompt={false} />
                    <Link
                        href="/dashboard/assets"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98]"
                    >
                        <Plus size={14} />
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
                <div className="rounded-xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] px-5 py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-6">
                        <span className="text-white/30">Live Prices</span>
                        <span className="text-yellow-400">
                            Gold: ${prices.goldPerGram.toFixed(2)}/g
                        </span>
                        <span className="text-slate-400">
                            Silver: ${prices.silverPerGram.toFixed(2)}/g
                        </span>
                    </div>
                    <span className="text-white/20">
                        {new Date(prices.lastUpdated).toLocaleTimeString()}
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
                        <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6">
                            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-6">
                                Asset Breakdown
                            </h3>
                            <div className="flex items-center gap-8">
                                <div className="w-48 h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dashboard.assetBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {dashboard.assetBreakdown.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                        stroke="transparent"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    background: '#1a1d27',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    color: '#e2e8f0',
                                                }}
                                                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 space-y-3">
                                    {dashboard.assetBreakdown.map((entry) => (
                                        <div key={entry.type} className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-xs text-white/50 flex-1">
                                                {entry.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs font-medium text-white/80">
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
                        <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] border-dashed p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <Plus size={24} className="text-emerald-400" />
                            </div>
                            <h3 className="text-base font-semibold text-white/70 mb-2">
                                Add your first asset
                            </h3>
                            <p className="text-sm text-white/30 mb-4 max-w-sm mx-auto">
                                Start by adding your cash, bank accounts, investments, or gold to calculate your Zakat obligation.
                            </p>
                            <Link
                                href="/dashboard/assets"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-semibold border border-emerald-500/20 hover:bg-emerald-500/25 transition-all"
                            >
                                <Plus size={14} />
                                Add Assets
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right column — Details & Actions */}
                <div className="space-y-6">
                    {/* Calculation summary */}
                    <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6">
                        <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
                            Calculation Details
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-white/40">Gross Assets</span>
                                <span className="text-white/70">{formatCurrency(dashboard.totalGrossAssets)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/40">Exempt / Deductions</span>
                                <span className="text-red-400/70">−{formatCurrency(dashboard.totalDeductions)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/40">Net Zakatable Assets</span>
                                <span className="text-white/70">{formatCurrency(dashboard.totalNetZakatableAssets)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/40">Liability Deduction ({settings.madhab})</span>
                                <span className="text-red-400/70">−{formatCurrency(dashboard.liabilityDeduction)}</span>
                            </div>
                            <div className="border-t border-white/[0.06] my-2" />
                            <div className="flex justify-between font-semibold">
                                <span className="text-white/60">Net Zakatable</span>
                                <span className="text-white">{formatCurrency(dashboard.netZakatableWealth)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <span className="text-white/60">× Rate</span>
                                <span className="text-emerald-400">{(dashboard.zakatRate * 100).toFixed(3)}%</span>
                            </div>
                            <div className="border-t border-white/[0.06] my-2" />
                            <div className="flex justify-between font-bold text-sm">
                                <span className="text-white/80">Zakat Due</span>
                                <span className="text-emerald-400">{formatCurrency(dashboard.zakatDue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="space-y-2">
                        <Link
                            href="/dashboard/history"
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 text-xs font-medium hover:bg-white/[0.06] hover:text-white/70 transition-all"
                        >
                            <History size={14} />
                            View Past Calculations
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
