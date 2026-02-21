'use client';

import { useZakatStore } from '@/lib/store';
import {
    type Madhab,
    type NisabStandard,
    type CalcBasis,
    CURRENCIES,
} from '@/lib/types';
import { Save, Check } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
    const { settings, setSettings, saveCurrentSettings } = useZakatStore();
    const [saved, setSaved] = useState(false);

    const updateSetting = <K extends keyof typeof settings>(
        key: K,
        value: (typeof settings)[K]
    ) => {
        setSettings({ ...settings, [key]: value });
    };

    const handleSave = async () => {
        await saveCurrentSettings();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-sm text-white/40 mt-1">
                        Configure your Zakat calculation preferences
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${saved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                        }`}
                >
                    {saved ? <Check size={14} /> : <Save size={14} />}
                    {saved ? 'Saved!' : 'Save Settings'}
                </button>
            </div>

            {/* Madhab */}
            <section className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6">
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">
                    School of Thought (Madhab)
                </h2>
                <p className="text-xs text-white/30 mb-4">
                    Affects liability deductions and jewelry exemptions
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {(
                        [
                            { value: 'Hanafi', desc: 'Deduct 12 months of debt. Jewelry is zakatable.' },
                            { value: 'Shafi', desc: 'Minimal debt deduction. Worn jewelry exempt.' },
                            { value: 'Maliki', desc: 'Only immediate debts. Worn jewelry exempt.' },
                            { value: 'Hanbali', desc: 'Strictest debt rules. Worn jewelry exempt.' },
                        ] as { value: Madhab; desc: string }[]
                    ).map((m) => (
                        <button
                            key={m.value}
                            onClick={() => updateSetting('madhab', m.value)}
                            className={`text-left p-4 rounded-xl transition-all ${settings.madhab === m.value
                                    ? 'bg-emerald-500/15 border border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                                    : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]'
                                }`}
                        >
                            <p
                                className={`text-sm font-semibold mb-1 ${settings.madhab === m.value ? 'text-emerald-400' : 'text-white/70'
                                    }`}
                            >
                                {m.value}
                            </p>
                            <p className="text-[10px] text-white/30 leading-relaxed">{m.desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Nisab Standard */}
            <section className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6">
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">
                    Nisab Standard
                </h2>
                <p className="text-xs text-white/30 mb-4">
                    The minimum wealth threshold. Gold nisab is recommended for those with mixed assets (gold + silver + cash).
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {(
                        [
                            { value: 'Gold', desc: '87.48g of gold (7.5 tolas)', emoji: '🥇' },
                            { value: 'Silver', desc: '612.36g of silver (52.5 tolas)', emoji: '🥈' },
                        ] as { value: NisabStandard; desc: string; emoji: string }[]
                    ).map((n) => (
                        <button
                            key={n.value}
                            onClick={() => updateSetting('nisabStandard', n.value)}
                            className={`text-left p-4 rounded-xl transition-all ${settings.nisabStandard === n.value
                                    ? 'bg-amber-500/15 border border-amber-500/30'
                                    : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]'
                                }`}
                        >
                            <p className="text-lg mb-1">{n.emoji}</p>
                            <p
                                className={`text-sm font-semibold mb-0.5 ${settings.nisabStandard === n.value ? 'text-amber-400' : 'text-white/70'
                                    }`}
                            >
                                {n.value}
                            </p>
                            <p className="text-[10px] text-white/30">{n.desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Calculation Basis */}
            <section className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6">
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">
                    Calendar Year
                </h2>
                <p className="text-xs text-white/30 mb-4">
                    Islāmic (Hijri) year is the standard. Gregorian option adjusts rate for the extra ~11 days.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {(
                        [
                            { value: 'Hijri', rate: '2.5%', days: '354 days (lunar)' },
                            { value: 'Gregorian', rate: '2.577%', days: '365 days (solar)' },
                        ] as { value: CalcBasis; rate: string; days: string }[]
                    ).map((c) => (
                        <button
                            key={c.value}
                            onClick={() => updateSetting('calculationBasis', c.value)}
                            className={`text-left p-4 rounded-xl transition-all ${settings.calculationBasis === c.value
                                    ? 'bg-purple-500/15 border border-purple-500/30'
                                    : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]'
                                }`}
                        >
                            <p
                                className={`text-sm font-semibold mb-0.5 ${settings.calculationBasis === c.value ? 'text-purple-400' : 'text-white/70'
                                    }`}
                            >
                                {c.value}
                            </p>
                            <p className="text-[10px] text-white/30">
                                {c.days} · Rate: {c.rate}
                            </p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Base Currency */}
            <section className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-6">
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-1">
                    Base Currency
                </h2>
                <p className="text-xs text-white/30 mb-4">
                    All values will be converted to this currency for Zakat calculation
                </p>
                <div className="grid grid-cols-4 gap-2">
                    {CURRENCIES.map((cur) => (
                        <button
                            key={cur}
                            onClick={() => updateSetting('baseCurrency', cur)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${settings.baseCurrency === cur
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:border-white/[0.12]'
                                }`}
                        >
                            {cur}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}
