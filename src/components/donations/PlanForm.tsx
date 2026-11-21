'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { useZakatStore } from '@/lib/store';
import { FREQUENCY_LABELS, addMonths, paymentsUntil, planSchedule } from '@/lib/donations';
import type { DonationPlan, PlanFrequency } from '@/lib/types';

const FREQUENCIES: PlanFrequency[] = ['once', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly'];

const input =
    'w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent';

/**
 * Payment-plan calculator: pick the total, how often and either an end date or
 * a number of payments; the schedule (to the cent) is shown before saving.
 */
export default function PlanForm({
    defaultTotal,
    defaultCategory = 'Zakat',
    onClose,
}: {
    defaultTotal?: number;
    defaultCategory?: DonationPlan['category'];
    onClose: () => void;
}) {
    const { saveDonationPlan, selectedYear, settings } = useZakatStore();
    const today = new Date().toISOString().slice(0, 10);
    const [category, setCategory] = useState<DonationPlan['category']>(defaultCategory);
    const [total, setTotal] = useState(defaultTotal ? defaultTotal.toFixed(2) : '');
    const [frequency, setFrequency] = useState<PlanFrequency>('monthly');
    const [startDate, setStartDate] = useState(today);
    const [mode, setMode] = useState<'endDate' | 'count'>('endDate');
    const [endDate, setEndDate] = useState(addMonths(today, 11));
    const [count, setCount] = useState('12');
    const [notes, setNotes] = useState('');

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency || 'USD' }).format(n);
    const fmtDate = (d: string) =>
        new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

    const amount = Number(total) || 0;
    const numberOfPayments =
        frequency === 'once'
            ? 1
            : mode === 'endDate'
              ? paymentsUntil(startDate, frequency, endDate)
              : Math.max(1, Math.min(520, Math.round(Number(count) || 1)));

    const schedule = useMemo(
        () => (amount > 0 && startDate ? planSchedule({ totalAmount: amount, frequency, startDate, numberOfPayments }) : []),
        [amount, frequency, startDate, numberOfPayments]
    );
    const first = schedule[0];
    const last = schedule[schedule.length - 1];

    const save = async () => {
        if (!(amount > 0) || !startDate) return;
        const plan: DonationPlan = {
            id: uuid(),
            zakatYear: selectedYear,
            category,
            totalAmount: Math.round(amount * 100) / 100,
            frequency,
            startDate,
            numberOfPayments,
            status: 'active',
            notes,
        };
        const saved = saveDonationPlan(plan);
        onClose();
        await saved.catch(() => {});
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Set up a payment plan</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">For</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value as DonationPlan['category'])} className={input}>
                            <option value="Zakat">Zakat {selectedYear}</option>
                            <option value="Sadaqah">Sadaqah</option>
                            <option value="Interest">Giving away interest</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Total ({settings.baseCurrency})</label>
                        <input type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} className={input} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">How often?</label>
                    <div className="grid grid-cols-3 gap-2">
                        {FREQUENCIES.map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setFrequency(f)}
                                className={`px-2 py-2 rounded-lg text-sm font-medium border transition-all ${frequency === f ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}`}
                            >
                                {FREQUENCY_LABELS[f]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{frequency === 'once' ? 'Pay on' : 'First payment'}</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} />
                    </div>
                    {frequency !== 'once' && (
                        <div>
                            <div className="flex items-center gap-3 mb-2 text-sm">
                                <button type="button" onClick={() => setMode('endDate')} className={mode === 'endDate' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                    Finish by
                                </button>
                                <span className="text-muted-foreground/40">|</span>
                                <button type="button" onClick={() => setMode('count')} className={mode === 'count' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                    No. of payments
                                </button>
                            </div>
                            {mode === 'endDate' ? (
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={input} />
                            ) : (
                                <input type="number" min="1" max="520" value={count} onChange={(e) => setCount(e.target.value)} className={input} />
                            )}
                        </div>
                    )}
                </div>

                {first && last && (
                    <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2">
                        <p className="text-sm text-foreground">
                            {schedule.length === 1 ? (
                                <>
                                    One payment of <strong className="tabular-nums">{fmt(first.amount)}</strong> on {fmtDate(first.date)}.
                                </>
                            ) : (
                                <>
                                    <strong className="tabular-nums">{schedule.length}</strong> payments of{' '}
                                    <strong className="tabular-nums">{fmt(first.amount)}</strong>
                                    {last.amount !== first.amount && <> (last one {fmt(last.amount)})</>}, from {fmtDate(first.date)} to{' '}
                                    {fmtDate(last.date)}.
                                </>
                            )}
                        </p>
                        {schedule.length > 1 && (
                            <details className="text-xs text-muted-foreground">
                                <summary className="cursor-pointer">Show every date</summary>
                                <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                    {schedule.map((s) => (
                                        <li key={s.index} className="flex justify-between tabular-nums">
                                            <span>{fmtDate(s.date)}</span>
                                            <span>{fmt(s.amount)}</span>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        )}
                        {category === 'Zakat' && (
                            <p className="text-xs text-muted-foreground">
                                Paying Zakat in instalments is permissible, though paying as soon as you can is better. Instalments paid
                                before your Zakat date count as Zakat paid in advance.
                            </p>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Notes (optional)</label>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Monthly to our masjid" className={input} />
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 rounded-md text-sm font-medium bg-secondary border border-border hover:bg-secondary/80">
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={!(amount > 0) || !startDate}
                        className="flex-1 py-2 rounded-md text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:opacity-50"
                    >
                        Save plan
                    </button>
                </div>
            </div>
        </div>
    );
}
