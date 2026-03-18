'use client';

import { useZakatStore } from '@/lib/store';
import {
    type Madhab,
    type NisabStandard,
    type CalcBasis,
    CURRENCIES,
} from '@/lib/types';
import { HIJRI_MONTHS, gregorianToHijri, formatHijriDate } from '@/lib/hijri-calendar';
import { ALL_STATES_PROVINCES } from '@/lib/tax-data';
import { Save, Check, ExternalLink, Calendar, Wallet, MapPin } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function SettingsPage() {
    const { settings, setSettings, saveCurrentSettings, spreadsheetId, backupSpreadsheetId } = useZakatStore();
    const [saved, setSaved] = useState(false);

    const currentHijri = useMemo(() => {
        const h = gregorianToHijri(new Date());
        return formatHijriDate(h);
    }, []);

    // Parse existing anniversary
    const annivMonth = settings.anniversaryHijri ? parseInt(settings.anniversaryHijri.split('-')[0]) : 0;
    const annivDay = settings.anniversaryHijri ? parseInt(settings.anniversaryHijri.split('-')[1]) : 1;

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
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure your Zakat calculation preferences
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${saved
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                >
                    {saved ? <Check size={14} /> : <Save size={14} />}
                    {saved ? 'Saved!' : 'Save Settings'}
                </button>
            </div>

            {/* Madhab */}
            <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">
                    School of Thought (Madhab)
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
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
                                ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-sm ring-1 ring-emerald-500/30'
                                : 'bg-background border border-border hover:bg-secondary/50'
                                }`}
                        >
                            <p
                                className={`text-sm font-semibold mb-1 ${settings.madhab === m.value ? 'text-emerald-600 dark:text-emerald-500' : 'text-foreground'
                                    }`}
                            >
                                {m.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{m.desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Nisab Standard */}
            <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">
                    Nisab Standard
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
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
                                ? 'bg-amber-500/10 border border-amber-500/20 ring-1 ring-amber-500/30'
                                : 'bg-background border border-border hover:bg-secondary/50'
                                }`}
                        >
                            <p className="text-lg mb-1">{n.emoji}</p>
                            <p
                                className={`text-sm font-semibold mb-0.5 ${settings.nisabStandard === n.value ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'
                                    }`}
                            >
                                {n.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{n.desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Calculation Basis */}
            <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">
                    Calendar Year
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
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
                                ? 'bg-purple-500/10 border border-purple-500/20 ring-1 ring-purple-500/30'
                                : 'bg-background border border-border hover:bg-secondary/50'
                                }`}
                        >
                            <p
                                className={`text-sm font-semibold mb-0.5 ${settings.calculationBasis === c.value ? 'text-purple-600 dark:text-purple-500' : 'text-foreground'
                                    }`}
                            >
                                {c.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {c.days} · Rate: {c.rate}
                            </p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Base Currency */}
            <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">
                    Base Currency
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                    All values will be converted to this currency for Zakat calculation
                </p>
                <div className="grid grid-cols-4 gap-2">
                    {CURRENCIES.map((cur) => (
                        <button
                            key={cur}
                            onClick={() => updateSetting('baseCurrency', cur)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${settings.baseCurrency === cur
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 ring-1 ring-emerald-500/30'
                                : 'bg-background text-muted-foreground border border-border hover:bg-secondary/50'
                                }`}
                        >
                            {cur}
                        </button>
                    ))}
                </div>
            </section>

            {/* Zakat Anniversary (Hijri) */}
            <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <Calendar size={16} className="text-purple-600 dark:text-purple-500" />
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Zakat Anniversary (Hawl)
                    </h2>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                    The Hijri date when your wealth first crossed Nisab. Your Hawl cycle resets annually on this date.
                </p>
                <p className="text-[10px] text-muted-foreground/70 mb-4">
                    Today: {currentHijri}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">Hijri Month</label>
                        <select
                            value={annivMonth}
                            onChange={(e) => {
                                const m = parseInt(e.target.value);
                                updateSetting('anniversaryHijri', m > 0 ? `${m}-${annivDay}` : undefined);
                            }}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                        >
                            <option value={0}>Not set</option>
                            {HIJRI_MONTHS.map((name, idx) => (
                                <option key={idx} value={idx + 1}>
                                    {idx + 1}. {name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1.5">Hijri Day</label>
                        <select
                            value={annivDay}
                            onChange={(e) => {
                                const d = parseInt(e.target.value);
                                if (annivMonth > 0) {
                                    updateSetting('anniversaryHijri', `${annivMonth}-${d}`);
                                }
                            }}
                            disabled={annivMonth === 0}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all disabled:opacity-30 disabled:bg-secondary"
                        >
                            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {annivMonth > 0 && (
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-500/80 mt-3">
                        Anniversary: {annivDay} {HIJRI_MONTHS[annivMonth - 1]} each year
                    </p>
                )}
            </section>

            {/* Tax & Retirement Settings */}
            <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <Wallet size={16} className="text-blue-600 dark:text-blue-500" />
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Tax & Retirement Settings
                    </h2>
                </div>
                <p className="text-xs text-muted-foreground mb-5">
                    Used for estimating early withdrawal penalties and marginal tax on retirement accounts (401k, RRSP).
                </p>

                {/* Income Level */}
                <div className="mb-5">
                    <label className="block text-xs text-muted-foreground mb-2">Annual Income Level (approx.)</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min={0}
                            max={500000}
                            step={5000}
                            value={settings.incomeLevel ?? 75000}
                            onChange={(e) => updateSetting('incomeLevel', parseInt(e.target.value))}
                            className="flex-1 h-2 rounded-full appearance-none bg-secondary border border-border accent-blue-600 dark:accent-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-mono font-medium text-foreground min-w-[80px] text-right">
                            ${((settings.incomeLevel ?? 75000) / 1000).toFixed(0)}k
                        </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-2">
                        This is used to estimate your marginal tax rate. It is not stored externally.
                    </p>
                </div>

                {/* State/Province */}
                <div className="mb-5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <MapPin size={12} className="text-muted-foreground" />
                        <label className="text-xs text-muted-foreground">State / Province</label>
                    </div>
                    <select
                        value={settings.stateProvince ?? ''}
                        onChange={(e) =>
                            updateSetting('stateProvince', e.target.value || undefined)
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                    >
                        <option value="">Not set (federal only)</option>
                        <optgroup label="🇺🇸 United States">
                            {ALL_STATES_PROVINCES
                                .filter((s) => s.country === 'US')
                                .map((s) => (
                                    <option key={s.code} value={s.code}>
                                        {s.name} ({(s.rate * 100).toFixed(1)}%)
                                    </option>
                                ))}
                        </optgroup>
                        <optgroup label="🇨🇦 Canada">
                            {ALL_STATES_PROVINCES
                                .filter((s) => s.country === 'CA')
                                .map((s) => (
                                    <option key={s.code} value={s.code}>
                                        {s.name} ({(s.rate * 100).toFixed(1)}%)
                                    </option>
                                ))}
                        </optgroup>
                    </select>
                </div>

                {/* Retirement Age Toggle */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <button
                            onClick={() =>
                                updateSetting('isUnderRetirementAge', !settings.isUnderRetirementAge)
                            }
                            className={`relative w-10 h-5 rounded-full transition-all border ${
                                settings.isUnderRetirementAge
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-secondary border-border'
                            }`}
                        >
                            <div
                                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${
                                    settings.isUnderRetirementAge ? 'left-[22px]' : 'left-0.5'
                                }`}
                            />
                        </button>
                        <div>
                            <p className="text-xs font-medium text-foreground group-hover:text-blue-600 transition-colors">
                                Under retirement age (59½ in US / 65 in Canada)
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {settings.isUnderRetirementAge
                                    ? 'Early withdrawal penalty will be applied to taxable retirement accounts'
                                    : 'No early withdrawal penalty applied'}
                            </p>
                        </div>
                    </label>
                </div>
            </section>

            {/* Data Storage & Backups */}
            <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">
                    Data Storage & Backups
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                    Your data is securely stored in your personal Google Drive. A real-time backup sheet receives automatic twin updates for maximum safety.
                </p>
                <div className="grid gap-3">
                    <a
                        href={spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 rounded-xl transition-all bg-background border border-border hover:bg-secondary/50 group"
                    >
                        <div>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-500 mb-0.5">
                                Primary Data Sheet
                            </p>
                            <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                                The live document ZakatFlow uses for calculations
                            </p>
                        </div>
                        <ExternalLink size={16} className="text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                    </a>

                    <a
                        href={backupSpreadsheetId ? `https://docs.google.com/spreadsheets/d/${backupSpreadsheetId}` : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 rounded-xl transition-all bg-background border border-border hover:bg-secondary/50 group"
                    >
                        <div>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-500 mb-0.5">
                                Real-time Backup Sheet
                            </p>
                            <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                                A mirror copy automatically updated alongside your primary sheet
                            </p>
                        </div>
                        <ExternalLink size={16} className="text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                    </a>
                </div>
            </section>
        </div>
    );
}
