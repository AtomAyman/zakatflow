'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useZakatStore } from '@/lib/store';
import { allocationProblems } from '@/lib/donations';
import type { DonationCategory } from '@/lib/types';

export interface PaymentDefaults {
    category?: DonationCategory;
    amount?: number;
    planId?: string;
    title?: string;
}

const CATEGORIES: { value: DonationCategory; label: string; active: string }[] = [
    { value: 'Zakat', label: 'Zakat', active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { value: 'Sadaqah', label: 'Sadaqah', active: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    { value: 'Interest', label: 'Interest', active: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    { value: 'Other', label: 'Other', active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
];

const input =
    'w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent';

/**
 * Record one payment, split across one or more recipients. Each recipient is
 * saved as its own row in the Donations tab, linked by a payment ID.
 */
export default function PaymentForm({ defaults, onClose }: { defaults?: PaymentDefaults; onClose: () => void }) {
    const { savePayment, selectedYear, settings } = useZakatStore();
    const [category, setCategory] = useState<DonationCategory>(defaults?.category ?? 'Zakat');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [rows, setRows] = useState([{ recipient: '', amount: defaults?.amount ? defaults.amount.toFixed(2) : '' }]);
    const [problems, setProblems] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows]);
    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency || 'USD' }).format(n);

    const update = (i: number, patch: Partial<(typeof rows)[number]>) =>
        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

    const submit = async () => {
        const allocations = rows.map((r) => ({ recipient: r.recipient, amount: Number(r.amount) || 0 }));
        const found = allocationProblems(allocations);
        if (!date) found.push('Choose the payment date.');
        setProblems(found);
        if (found.length) return;
        setSaving(true);
        const saved = savePayment({
            date,
            zakatYear: selectedYear,
            category,
            notes,
            planId: category === defaults?.category ? defaults?.planId : undefined,
            allocations,
        });
        // Added to the ledger immediately; a failed save stays queued (retry banner).
        onClose();
        await saved.catch(() => {});
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">{defaults?.title ?? 'Record a payment'}</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">What is it for?</label>
                    <div className="grid grid-cols-4 gap-2">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => setCategory(c.value)}
                                className={`px-2 py-2 rounded-lg text-sm font-medium border transition-all ${category === c.value ? c.active : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    {category === 'Interest' && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            Giving away interest clears it from your accounts. It does not count as Zakat or Sadaqah.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Counts toward</label>
                        <input value={`Zakat year ${selectedYear}`} readOnly className={`${input} text-muted-foreground`} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Where is it going? ({settings.baseCurrency})
                    </label>
                    <div className="space-y-2">
                        {rows.map((r, i) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    value={r.recipient}
                                    onChange={(e) => update(i, { recipient: e.target.value })}
                                    placeholder="e.g. Local masjid, food bank"
                                    className={`${input} flex-1`}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={r.amount}
                                    onChange={(e) => update(i, { amount: e.target.value })}
                                    placeholder="0.00"
                                    className={`${input} w-32`}
                                />
                                {rows.length > 1 && (
                                    <button
                                        type="button"
                                        aria-label="Remove recipient"
                                        onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                                        className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <button
                            type="button"
                            onClick={() => setRows((rs) => [...rs, { recipient: '', amount: '' }])}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700"
                        >
                            <Plus size={14} /> Add another recipient
                        </button>
                        <p className="text-sm text-muted-foreground">
                            Total <span className="font-semibold text-foreground tabular-nums">{fmt(total)}</span>
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${input} resize-none`} />
                </div>

                {problems.length > 0 && (
                    <ul className="text-sm text-destructive list-disc pl-5 space-y-1">
                        {problems.map((p) => (
                            <li key={p}>{p}</li>
                        ))}
                    </ul>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 rounded-md text-sm font-medium bg-secondary border border-border hover:bg-secondary/80">
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="flex-1 py-2 rounded-md text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:opacity-60"
                    >
                        Save payment
                    </button>
                </div>
            </div>
        </div>
    );
}
