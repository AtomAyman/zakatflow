'use client';

import { useState, useMemo } from 'react';
import { useZakatStore } from '@/lib/store';
import type { DonationEntry } from '@/lib/types';
import { Plus, Trash2, X, Heart, Download, Calendar } from 'lucide-react';
import { v4 as uuid } from 'uuid';

export default function DonationsPage() {
    const { selectedYear, settings } = useZakatStore();

    // Local state for donations (persisted via store if wired up, otherwise local)
    const [donations, setDonations] = useState<DonationEntry[]>([]);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newAmount, setNewAmount] = useState('');
    const [newRecipient, setNewRecipient] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [newCategory, setNewCategory] = useState<DonationEntry['category']>('Zakat');

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: settings.baseCurrency || 'USD',
            maximumFractionDigits: 0,
        }).format(n);

    const totalDonated = useMemo(() =>
        donations.reduce((sum, d) => sum + d.amount, 0),
        [donations]
    );

    const zakatDonated = useMemo(() =>
        donations.filter(d => d.category === 'Zakat').reduce((s, d) => s + d.amount, 0),
        [donations]
    );

    const sadaqahDonated = useMemo(() =>
        donations.filter(d => d.category === 'Sadaqah').reduce((s, d) => s + d.amount, 0),
        [donations]
    );

    const resetForm = () => {
        setNewDate(new Date().toISOString().split('T')[0]);
        setNewAmount('');
        setNewRecipient('');
        setNewNotes('');
        setNewCategory('Zakat');
    };

    const handleAdd = () => {
        if (!newAmount || Number(newAmount) <= 0) return;
        const entry: DonationEntry = {
            id: uuid(),
            date: newDate,
            amount: Number(newAmount),
            recipient: newRecipient || 'Unspecified',
            notes: newNotes,
            category: newCategory,
        };
        setDonations(prev => [entry, ...prev]);
        resetForm();
        setShowForm(false);
    };

    const handleDelete = (id: string) => {
        setDonations(prev => prev.filter(d => d.id !== id));
    };

    const exportCSV = () => {
        const headers = 'Date,Category,Amount,Recipient,Notes\n';
        const rows = donations.map(d =>
            `${d.date},${d.category},${d.amount},"${d.recipient}","${d.notes || ''}"`
        ).join('\n');
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nisabflow-donations-${selectedYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Heart size={24} className="text-rose-500" />
                        Donation Ledger
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground">Track your Zakat & Sadaqah payments for {selectedYear}</p>
                </div>
                <div className="flex items-center gap-3">
                    {donations.length > 0 && (
                        <button onClick={exportCSV}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
                        >
                            <Download size={16} /> Export CSV
                        </button>
                    )}
                    <button onClick={() => { resetForm(); setShowForm(true); }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Add Donation
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Donated</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDonated)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-2">Zakat</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(zakatDonated)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5">
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-500 uppercase tracking-wider mb-2">Sadaqah</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">{formatCurrency(sadaqahDonated)}</p>
                </div>
            </div>

            {/* Add form modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-md rounded-xl bg-card text-card-foreground border border-border shadow-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">New Donation</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Zakat', 'Sadaqah', 'Other'] as DonationEntry['category'][]).map((cat) => (
                                    <button key={cat} type="button" onClick={() => setNewCategory(cat)}
                                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${newCategory === cat
                                            ? cat === 'Zakat'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                                                : cat === 'Sadaqah'
                                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-sm'
                                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-sm'
                                            : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                                            }`}
                                    >{cat}</button>
                                ))}
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Amount ({settings.baseCurrency})</label>
                            <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0"
                                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Recipient */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Recipient / Organization</label>
                            <input type="text" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="e.g. Local Masjid, UNHCR"
                                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Notes (optional)</label>
                            <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Any details..."
                                rows={2}
                                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setShowForm(false)}
                                className="flex-1 py-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-colors"
                            >Cancel</button>
                            <button onClick={handleAdd}
                                className="flex-1 py-2 rounded-md text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                            >Add Donation</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Donation List */}
            {donations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                        <Heart size={28} className="text-rose-500" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">No donations recorded yet</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">Track your Zakat and Sadaqah payments to keep a clear record.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {donations.map((d) => (
                        <div key={d.id} className="group rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 flex items-center gap-4 hover:border-primary/30 transition-all">
                            {/* Category badge */}
                            <div className={`w-2.5 h-10 rounded-full flex-shrink-0 ${d.category === 'Zakat' ? 'bg-emerald-500'
                                : d.category === 'Sadaqah' ? 'bg-purple-500' : 'bg-blue-500'
                                }`} />

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <p className="text-base font-semibold text-foreground truncate">{d.recipient}</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${d.category === 'Zakat'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : d.category === 'Sadaqah'
                                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                        }`}>{d.category}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                        <Calendar size={14} className="opacity-70" />
                                        <p>{new Date(d.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
                                    </div>
                                    {d.notes && (
                                        <>
                                            <span className="text-muted-foreground/30">•</span>
                                            <p className="text-xs text-muted-foreground truncate">{d.notes}</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Amount */}
                            <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(d.amount)}</p>

                            {/* Delete */}
                            <button onClick={() => handleDelete(d.id)}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ml-2 flex-shrink-0"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
