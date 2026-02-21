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
} from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    {
      icon: Calculator,
      title: 'Fiqh-Accurate Calculations',
      desc: 'Supports Hanafi, Shafi, Maliki, and Hanbali rulings with automatic liability deductions.',
      color: 'from-emerald-400 to-emerald-600',
      shadow: 'shadow-emerald-500/10',
    },
    {
      icon: Shield,
      title: 'Retirement-Aware',
      desc: '401k/IRA/RRSP penalty & tax deductions applied automatically before Zakat calculation.',
      color: 'from-blue-400 to-blue-600',
      shadow: 'shadow-blue-500/10',
    },
    {
      icon: Database,
      title: 'Your Data, Your Sheet',
      desc: 'Everything saved to your own Google Sheet. Full transparency, no vendor lock-in.',
      color: 'from-purple-400 to-purple-600',
      shadow: 'shadow-purple-500/10',
    },
    {
      icon: BarChart3,
      title: 'Tax Benefit Analysis',
      desc: 'See your real after-tax cost. US Schedule A and Canadian tax credit calculations included.',
      color: 'from-amber-400 to-amber-600',
      shadow: 'shadow-amber-500/10',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="hero-gradient fixed inset-0 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              ZakatFlow
            </span>
          </div>
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 font-medium hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Sparkles size={12} />
              Sheet-Backed • Fiqh-Accurate • Open
            </div>
          </div>

          {/* Headline */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              <span className="text-white">Calculate Zakat</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
                with confidence
              </span>
            </h1>
            <p className="text-lg text-white/40 leading-relaxed max-w-xl mx-auto">
              The only Zakat calculator that handles retirement accounts, tax deductions, and all four Madhabs — backed by your own Google Sheet.
            </p>
          </div>

          {/* CTA */}
          <div className="flex justify-center gap-4 mb-20">
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 transition-all active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-20">
            {[
              { icon: TrendingUp, value: '4', label: 'Madhabs' },
              { icon: Coins, value: 'Live', label: 'Prices' },
              { icon: Shield, value: '100%', label: 'Your Data' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon size={18} className="mx-auto mb-2 text-emerald-400/60" />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-surface/40 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg ${f.shadow} mb-4`}
                >
                  <f.icon size={18} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-white/20">
            ZakatFlow — Built with sincerity. Your data stays in your Google Drive.
          </p>
        </div>
      </footer>
    </div>
  );
}
