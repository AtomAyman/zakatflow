'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { X } from 'lucide-react';
import type { InterestEntry } from '@/lib/types';

const input =
    'w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

/** Record interest an account paid (from a statement), per month, year or other period. */
export default function InterestForm({
    accounts,
    defaultCurrency,
    zakatYear,
    onSave,
    onClose,
}: {
    accounts: { id: string; name: string; currency: string }[];
    defaultCurrency: string;
    zakatYear: string;
    onSave: (entry: InterestEntry) => void;
    onClose: () => void;
}) {
    const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
    const [accountName, setAccountName] = useState('');
    const [currency, setCurrency] = useState(accounts[0]?.currency ?? defaultCurrency);
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState<InterestEntry['period']>('month');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');

    const chosen = accounts.find((a) => a.id === accountId);
    const valid = Number(amount) > 0 && date && (chosen || accountName.trim());

    const save = () => {
        if (!valid) return;
        onSave({
            id: uuid(),
            zakatYear,
            date,
            assetId: chosen?.id,
            accountName: chosen ? chosen.name : accountName.trim(),
            currency: chosen ? chosen.currency : currency,
            amount: Math.round(Number(amount) * 100) / 100,
            period,
            notes,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Add interest earned</h2>
                    <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Account</label>
                    <select value={accountId} onChange={(e) => {
                        setAccountId(e.target.value);
                        const a = accounts.find((x) => x.id === e.target.value);
                        if (a) setCurrency(a.currency);
                    }} className={input}>
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                        <option value="">Another account…</option>
                    </select>
                    {!chosen && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" className={`${input} col-span-2`} />
                            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} placeholder="USD" className={input} />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-2">Interest ({chosen?.currency ?? currency})</label>
                        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={input} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">For the</label>
                        <select value={period} onChange={(e) => setPeriod(e.target.value as InterestEntry['period'])} className={input}>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                            <option value="other">Other period</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Ending on (statement date)</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 rounded-md text-sm font-medium bg-secondary border border-border">Cancel</button>
                    <button onClick={save} disabled={!valid} className="flex-1 py-2 rounded-md text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">Save</button>
                </div>
            </div>
        </div>
    );
}
