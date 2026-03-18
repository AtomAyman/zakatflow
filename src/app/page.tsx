'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
    Shield,
    Calculator,
    BarChart3,
    Database,
    ArrowRight,
    Sparkles,
    TrendingUp,
    Coins,
    Target,
    Calendar,
    DollarSign,
    CheckCircle2,
    Mail,
    Globe,
    BookOpen,
} from 'lucide-react';
import Logo from '@/components/Logo';

export default function LandingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session) {
            router.push('/dashboard');
        }
    }, [session, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const features = [
        {
            icon: Calculator,
            title: 'Fiqh-Accurate Calculations',
            desc: 'All four Madhabs supported. Hanafi debt deductions, jewelry exemptions, and liability rules applied automatically.',
            color: 'from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500',
            shadow: 'shadow-emerald-500/20',
        },
        {
            icon: Shield,
            title: 'Retirement-Aware Engine',
            desc: '401k, IRA, RRSP penalty & tax deductions. Auto-calculates early withdrawal penalties and marginal tax rates.',
            color: 'from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500',
            shadow: 'shadow-blue-500/20',
        },
        {
            icon: Database,
            title: 'Your Data, Your Sheet',
            desc: 'Everything saved to your own Google Sheet with real-time backup. Full transparency, zero vendor lock-in.',
            color: 'from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500',
            shadow: 'shadow-purple-500/20',
        },
        {
            icon: BarChart3,
            title: 'Scholarly Stock Valuation',
            desc: 'Active vs. passive holdings. Manual %, 30% proxy rule, or commodity ETF - applying consensus scholarly methodology.',
            color: 'from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500',
            shadow: 'shadow-amber-500/20',
        },
        {
            icon: Calendar,
            title: 'Hijri Calendar Integration',
            desc: 'Umm al-Qura Hijri calendar tracks your Hawl anniversary. Visual countdown with both Hijri and Gregorian dates.',
            color: 'from-rose-500 to-rose-600 dark:from-rose-400 dark:to-rose-500',
            shadow: 'shadow-rose-500/20',
        },
        {
            icon: Mail,
            title: 'Smart Reminders',
            desc: 'Email reminders at 30 days, 7 days, and day-of your Zakat anniversary. Finalization receipts for your records.',
            color: 'from-cyan-500 to-cyan-600 dark:from-cyan-400 dark:to-cyan-500',
            shadow: 'shadow-cyan-500/20',
        },
    ];

    const methodologySteps = [
        { step: '01', title: 'Add Your Assets', desc: 'Cash, stocks, gold, crypto, retirement — every asset class, categorized by fiqh ruling.' },
        { step: '02', title: 'Deduct Liabilities', desc: 'Madhab-specific debt rules applied. Hanafi? 12 months deducted. Shafi? Only immediate debts.' },
        { step: '03', title: 'Check Nisab', desc: 'Live gold/silver prices determine your threshold. Quarterly sparkline shows Nisab trends.' },
        { step: '04', title: 'Pay with Confidence', desc: 'Track donations, get a receipt, and finalize your year. Everything saved to your Sheet.' },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden bg-background text-foreground transition-colors">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-background to-background" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 px-6 py-6 font-sans">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Logo size={40} />
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400 bg-clip-text text-transparent">
                            NisabFlow
                        </span>
                    </div>
                    <button
                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                        className="px-5 py-2.5 rounded-xl bg-secondary/80 border border-border text-sm font-semibold hover:bg-secondary hover:border-secondary-foreground/20 transition-all shadow-sm"
                    >
                        Sign In
                    </button>
                </div>
            </header>

            {/* Hero */}
            <main className="relative z-10 px-6 pt-16 pb-32">
                <div className="max-w-6xl mx-auto">
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-wide">
                            <Sparkles size={14} className="text-amber-500" />
                            Syncs with Google Sheets · Fiqh-Accurate · Hijri-Aware · Open
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="text-center max-w-3xl mx-auto mb-8">
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
                            <span className="text-foreground">Calculate Zakat</span>
                            <br />
                            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 dark:from-emerald-400 dark:via-emerald-300 dark:to-amber-400 bg-clip-text text-transparent">
                                with confidence
                            </span>
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto font-medium">
                            A comprehensive Zakat calculator that handles retirement accounts, tax deductions, scholarly stock methodology, and all four Madhabs - safely synced to your personal Google Sheet.
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="flex justify-center gap-4 mb-20">
                        <button
                            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                            className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-500 dark:to-emerald-600 text-white font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-600 transition-all active:scale-[0.98]"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 bg-white rounded-full p-0.5" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Get Started Free
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a
                            href="#preview"
                            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-secondary/50 border border-border text-foreground font-semibold hover:bg-secondary hover:border-border transition-all shadow-sm"
                        >
                            <BookOpen size={18} className="text-emerald-600 dark:text-emerald-400" />
                            See How It Works
                        </a>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-6 max-w-xl mx-auto mb-24">
                        {[
                            { icon: Calculator, value: '4', label: 'Madhabs' },
                            { icon: Coins, value: 'Live', label: 'Prices' },
                            { icon: Globe, value: 'Hijri', label: 'Calendar' },
                            { icon: Shield, value: '100%', label: 'Your Data' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <stat.icon size={24} className="mx-auto mb-3 text-emerald-600 dark:text-emerald-500 opacity-80" />
                                <p className="text-2xl font-black text-foreground">{stat.value}</p>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Feature grid */}
                    <div id="features" className="mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-foreground mb-4">Why NisabFlow?</h2>
                            <p className="text-base text-muted-foreground max-w-xl mx-auto font-medium">
                                Built by Muslims, for Muslims. Every ruling sourced from scholarly consensus for maximum peace of mind.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {features.map((f) => (
                                <div
                                    key={f.title}
                                    className="group p-8 rounded-2xl bg-card border border-border hover:border-emerald-500/30 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 focus-within:ring-2 focus-within:ring-emerald-500/20"
                                >
                                    <div
                                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-md ${f.shadow} mb-6`}
                                    >
                                        <f.icon size={20} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How It Works */}
                    <div className="mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-foreground mb-4">How It Works</h2>
                            <p className="text-base text-muted-foreground max-w-xl mx-auto font-medium">
                                Four clear steps to a precisely calculated, fiqh-compliant Zakat obligation.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                            {methodologySteps.map((s) => (
                                <div key={s.step} className="relative group">
                                    <div className="text-6xl font-black text-emerald-500/10 dark:text-emerald-500/5 mb-4 group-hover:scale-110 transition-transform origin-left">{s.step}</div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sample Dashboard Preview */}
                    <div id="preview" className="mb-32">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-black text-foreground mb-4">See It In Action</h2>
                            <p className="text-base text-muted-foreground max-w-xl mx-auto font-medium">
                                A clean, data-dense interface that shows you exactly what you owe and why.
                            </p>
                        </div>

                        {/* Mock Dashboard */}
                        <div className="max-w-5xl mx-auto relative px-4 sm:px-0">
                            <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-3xl blur-3xl pointer-events-none" />
                            <div className="relative rounded-2xl bg-card border border-border p-6 lg:p-8 shadow-2xl overflow-hidden">
                                {/* Mock header */}
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-border pb-6">
                                    <div>
                                        <p className="text-xl font-black text-foreground">Dashboard</p>
                                        <p className="text-xs font-semibold text-muted-foreground mt-1 tracking-wide">2026 · Hanafi · Hijri · 2.5% · USD</p>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                        Sample View
                                    </div>
                                </div>

                                {/* Mock summary cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    {[
                                        { title: 'Total Net Worth', value: '$142,500', icon: DollarSign, color: 'from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-600' },
                                        { title: 'Zakatable Wealth', value: '$98,750', icon: TrendingUp, color: 'from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-600' },
                                        { title: 'Nisab Threshold', value: '$7,698', icon: Target, color: 'from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-600' },
                                        { title: 'Zakat Due', value: '$2,469', icon: Coins, color: 'from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-600' },
                                    ].map((card) => (
                                        <div key={card.title} className="rounded-xl bg-secondary/30 border border-border p-5">
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-sm`}>
                                                <card.icon size={18} className="text-white" />
                                            </div>
                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{card.title}</p>
                                            <p className="text-2xl font-black text-foreground">{card.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Mock content */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left - Nisab bar */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Nisab thermometer mock */}
                                        <div className="rounded-xl bg-secondary/30 border border-border p-6">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Nisab Thermometer</p>
                                            <div className="h-6 rounded-full bg-secondary overflow-hidden mb-3 border border-border">
                                                <div className="h-full w-[90%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 relative">
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span className="text-muted-foreground">$0</span>
                                                <span className="text-emerald-600 dark:text-emerald-400">$98,750 - Above Nisab ✓</span>
                                            </div>
                                        </div>

                                        {/* Mock asset breakdown */}
                                        <div className="rounded-xl bg-secondary/30 border border-border p-6">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Asset Breakdown</p>
                                            <div className="space-y-4">
                                                {[
                                                    { type: 'Bank Accounts', value: '$45,000', pct: 45, color: 'bg-blue-500' },
                                                    { type: 'Stocks (Passive)', value: '$32,500', pct: 32, color: 'bg-purple-500' },
                                                    { type: 'Gold (18K)', value: '$12,800', pct: 13, color: 'bg-amber-500' },
                                                    { type: '401k (After Tax)', value: '$8,450', pct: 8, color: 'bg-rose-500' },
                                                ].map((a) => (
                                                    <div key={a.type} className="flex items-center gap-4">
                                                        <div className={`w-3 h-3 rounded-full ${a.color} flex-shrink-0`} />
                                                        <span className="text-sm font-semibold text-foreground flex-1">{a.type}</span>
                                                        <div className="hidden sm:block w-32 h-2 rounded-full bg-secondary overflow-hidden border border-border">
                                                            <div className={`h-full rounded-full ${a.color} opacity-80`} style={{ width: `${a.pct}%` }} />
                                                        </div>
                                                        <span className="text-sm text-muted-foreground font-bold w-20 text-right">{a.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right - Hawl + Calc */}
                                    <div className="space-y-6">
                                        {/* Hawl tracker mock */}
                                        <div className="rounded-xl bg-secondary/30 border border-border p-6 text-center">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">Hawl Anniversary</p>
                                            <div className="relative w-28 h-28 mx-auto mb-6">
                                                <svg width="112" height="112" className="transform -rotate-90">
                                                    <circle cx="56" cy="56" r="48" fill="none" className="stroke-secondary" strokeWidth="8" />
                                                    <circle cx="56" cy="56" r="48" fill="none" className="stroke-emerald-500" strokeWidth="8" strokeLinecap="round"
                                                        strokeDasharray={`${2 * Math.PI * 48}`}
                                                        strokeDashoffset={`${2 * Math.PI * 48 * 0.35}`}
                                                        style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.3))' }}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">127</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">days</span>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-foreground">1 Ramadan 1448 AH</p>
                                            <p className="text-xs text-muted-foreground font-medium mt-1">Feb 24, 2027</p>
                                        </div>

                                        {/* Calc details mock */}
                                        <div className="rounded-xl bg-secondary/30 border border-border p-6">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Calculation</p>
                                            <div className="space-y-3 text-sm font-medium">
                                                <div className="flex justify-between"><span className="text-muted-foreground">Gross Details</span><span className="text-foreground">$142,500</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">Asset Deductions</span><span className="text-rose-600 dark:text-rose-400">−$43,750</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">Liabilities</span><span className="text-rose-600 dark:text-rose-400">−$0</span></div>
                                                <div className="border-t border-border my-2" />
                                                <div className="flex justify-between font-bold"><span className="text-muted-foreground">Net Zakatable</span><span className="text-foreground">$98,750</span></div>
                                                <div className="flex justify-between font-black text-base mt-2"><span className="text-muted-foreground">Zakat Due</span><span className="text-emerald-600 dark:text-emerald-400">$2,469</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scholarly Methodology Explainer */}
                    <div className="mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-foreground mb-4">Scholarly Stock Methodology</h2>
                            <p className="text-base text-muted-foreground max-w-xl mx-auto font-medium">
                                We follow widely accepted Islamic finance guidelines for calculating Zakat on investments.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {/* Active */}
                            <div className="rounded-2xl bg-card border border-border p-8 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/10 mb-6">
                                    <TrendingUp size={20} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-3">Active Holdings</h3>
                                <p className="text-sm text-muted-foreground font-medium mb-6 leading-relaxed">
                                    Stocks you trade frequently or hold for less than a year. These are treated liquidly, just like cash.
                                </p>
                                <div className="rounded-xl bg-secondary border border-border p-4 shadow-inner">
                                    <p className="text-xs font-mono font-semibold text-foreground text-center">
                                        Market Value × 2.5% = Zakat
                                    </p>
                                </div>
                            </div>

                            {/* Passive */}
                            <div className="rounded-2xl bg-card border border-border p-8 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-400 dark:to-violet-500 flex items-center justify-center shadow-md shadow-violet-500/10 mb-6">
                                    <BarChart3 size={20} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-3">Passive Holdings</h3>
                                <p className="text-sm text-muted-foreground font-medium mb-6 leading-relaxed">
                                    Long-term investments held for over a year. Only the zakatable assets of the company are subject to Zakat.
                                </p>
                                <div className="rounded-xl bg-secondary border border-border p-4 shadow-inner space-y-2 text-center">
                                    <p className="text-[11px] font-mono font-bold text-foreground break-words sm:break-normal">
                                        Current Assets × (Shares / Outstanding) × 2.5%
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                        Or use the scholar-approved 30% proxy rule
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final CTA */}
                    <div className="text-center mb-16">
                        <div className="inline-flex flex-col items-center gap-5 px-12 py-12 rounded-[2rem] bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03] border border-emerald-500/20 shadow-sm">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                            <h2 className="text-2xl sm:text-3xl font-black text-foreground max-w-md">Ready to fulfill your obligation?</h2>
                            <p className="text-sm text-muted-foreground font-medium max-w-sm">
                                Sign in with Google to create your personal Zakat Sheet. It&apos;s free, private, and yours forever.
                            </p>
                            <button
                                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-500 dark:to-emerald-600 text-white font-bold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] mt-2"
                            >
                                Start Calculating
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-10 border-t border-border bg-card">
                <div className="max-w-6xl mx-auto text-center">
                    <p className="text-sm font-semibold text-muted-foreground">
                        NisabFlow - Built with sincerity. Your data stays securely in your Google Drive.
                    </p>
                </div>
            </footer>
        </div>
    );
}
