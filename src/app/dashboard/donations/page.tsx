'use client';

import { useMemo, useState } from 'react';
import { useZakatStore } from '@/lib/store';
import type { DonationCategory, DonationPlan } from '@/lib/types';
import { FREQUENCY_LABELS, groupPayments, planProgress } from '@/lib/donations';
import PaymentForm, { type PaymentDefaults } from '@/components/donations/PaymentForm';
import PlanForm from '@/components/donations/PlanForm';
import ZakatPaymentCard from '@/components/donations/ZakatPaymentCard';
import { Plus, Trash2, Heart, Download, Calendar, CalendarClock, Ban } from 'lucide-react';

const CATEGORY_STYLE: Record<DonationCategory, { bar: string; badge: string; label: string }> = {
    Zakat: { bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Zakat' },
    Sadaqah: { bar: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: 'Sadaqah' },
    Interest: { bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', label: 'Interest given away' },
    Other: { bar: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Other' },
};

const fmtDate = (d: string, withYear = true) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {
        year: withYear ? 'numeric' : undefined,
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });

export default function DonationsPage() {
    const {
        selectedYear,
        settings,
        donations: allDonations,
        donationPlans,
        deletePayment,
        saveDonationPlan,
        deleteDonationPlan,
        syncStatus,
    } = useZakatStore();
    const [payment, setPayment] = useState<PaymentDefaults | null>(null);
    const [planOpen, setPlanOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const today = new Date().toISOString().slice(0, 10);

    // Donations are stored in the user's sheet; show the selected Zakat year.
    const donations = useMemo(
        () =>
            allDonations
                .filter((d) => (d.zakatYear || d.date.slice(0, 4)) === selectedYear)
                .sort((a, b) => b.date.localeCompare(a.date)),
        [allDonations, selectedYear]
    );
    const payments = useMemo(() => groupPayments(donations), [donations]);
    const plans = useMemo(
        () => donationPlans.filter((p) => p.zakatYear === selectedYear).sort((a, b) => a.startDate.localeCompare(b.startDate)),
        [donationPlans, selectedYear]
    );

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency || 'USD' }).format(n);
    const sum = (c: DonationCategory) => donations.filter((d) => d.category === c).reduce((s, d) => s + d.amount, 0);
    const totals = { all: donations.reduce((s, d) => s + d.amount, 0), Zakat: sum('Zakat'), Sadaqah: sum('Sadaqah'), Interest: sum('Interest') };

    const run = async (p: Promise<void>, verb: string) => {
        setError(null);
        try {
            await p;
        } catch {
            setError(`${verb}, but not saved to your spreadsheet yet. Use Retry at the top of the page.`);
        }
    };

    const setStatus = (plan: DonationPlan, status: DonationPlan['status']) => run(saveDonationPlan({ ...plan, status }), 'Updated');

    const exportCSV = () => {
        const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
        const rows = donations.map((d) =>
            [d.date, CATEGORY_STYLE[d.category].label, d.amount, quote(d.recipient), quote(d.notes || ''), d.paymentId ?? d.id].join(',')
        );
        const blob = new Blob([['Date,Category,Amount,Recipient,Notes,Payment', ...rows].join('\n')], { type: 'text/csv' });
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
                    <p className="text-sm font-medium text-muted-foreground">Your Zakat, Sadaqah and interest given away for {selectedYear}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {donations.length > 0 && (
                        <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-secondary border border-border hover:bg-secondary/80">
                            <Download size={16} /> Export CSV
                        </button>
                    )}
                    <button onClick={() => setPlanOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-secondary border border-border hover:bg-secondary/80">
                        <CalendarClock size={16} /> Payment plan
                    </button>
                    <button onClick={() => setPayment({})} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 shadow-sm">
                        <Plus size={16} /> Record payment
                    </button>
                </div>
            </div>

            <ZakatPaymentCard />

            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    ['Total given', totals.all, 'text-foreground'],
                    ['Zakat', totals.Zakat, 'text-emerald-600 dark:text-emerald-500'],
                    ['Sadaqah', totals.Sadaqah, 'text-purple-600 dark:text-purple-500'],
                    ['Interest given away', totals.Interest, 'text-amber-700 dark:text-amber-500'],
                ].map(([label, value, cls]) => (
                    <div key={label as string} className="rounded-xl border border-border bg-card shadow-sm p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-xl font-bold tabular-nums ${cls}`}>{fmt(value as number)}</p>
                    </div>
                ))}
            </div>

            {/* Plans */}
            {plans.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment plans</h2>
                    {plans.map((plan) => {
                        const p = planProgress(plan, allDonations, today);
                        const pct = plan.totalAmount > 0 ? Math.min(100, (p.paid / plan.totalAmount) * 100) : 0;
                        return (
                            <div key={plan.id} className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            {CATEGORY_STYLE[plan.category].label}: {fmt(plan.totalAmount)}
                                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                                                {FREQUENCY_LABELS[plan.frequency]}
                                                {plan.numberOfPayments > 1 && ` · ${plan.numberOfPayments} payments`}
                                            </span>
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Paid {fmt(p.paid)} · left {fmt(p.remaining)}
                                            {plan.status === 'active' && p.next && <> · next {fmt(p.next.amount)} on {fmtDate(p.next.date)}</>}
                                            {plan.status === 'active' && p.overdue > 0 && <span className="text-amber-600"> · {p.overdue} overdue</span>}
                                            {plan.status !== 'active' && ` · ${plan.status}`}
                                        </p>
                                        {plan.notes && <p className="text-xs text-muted-foreground mt-1">{plan.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {plan.status === 'active' && !p.complete && (
                                            <button
                                                onClick={() =>
                                                    setPayment({
                                                        category: plan.category,
                                                        amount: Math.min(p.next?.amount ?? p.remaining, p.remaining),
                                                        planId: plan.id,
                                                        title: 'Record an instalment',
                                                    })
                                                }
                                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700"
                                            >
                                                Record instalment
                                            </button>
                                        )}
                                        {plan.status === 'active' && p.complete && (
                                            <button onClick={() => setStatus(plan, 'completed')} className="px-3 py-1.5 text-sm font-medium rounded-md bg-secondary border border-border">
                                                Mark complete
                                            </button>
                                        )}
                                        {plan.status === 'active' && (
                                            <button onClick={() => setStatus(plan, 'cancelled')} title="Stop this plan (payments made stay in the ledger)" className="p-2 rounded-md text-muted-foreground hover:bg-secondary">
                                                <Ban size={16} />
                                            </button>
                                        )}
                                        {plan.status !== 'active' && (
                                            <button onClick={() => run(deleteDonationPlan(plan.id), 'Removed')} title="Remove plan (payments made stay in the ledger)" className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                    <div className={`h-full ${CATEGORY_STYLE[plan.category].bar}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {error && (syncStatus === 'error' || syncStatus === 'reauth') && <p className="text-sm text-destructive">{error}</p>}

            {/* Payments */}
            <section className="space-y-3">
                {payments.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payments</h2>}
                {payments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                            <Heart size={28} className="text-rose-500" />
                        </div>
                        <p className="text-lg font-semibold text-foreground mb-2">No payments recorded yet</p>
                        <p className="text-sm text-muted-foreground">Record each payment, even one split between several charities.</p>
                    </div>
                ) : (
                    payments.map(({ paymentId, entries, total }) => {
                        const first = entries[0];
                        const style = CATEGORY_STYLE[first.category];
                        const plan = first.planId ? donationPlans.find((p) => p.id === first.planId) : undefined;
                        return (
                            <div key={paymentId} className="group rounded-xl border border-border bg-card shadow-sm p-4 flex gap-4">
                                <div className={`w-2.5 rounded-full flex-shrink-0 ${style.bar}`} />
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${style.badge}`}>{style.label}</span>
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Calendar size={13} /> {fmtDate(first.date)}
                                        </span>
                                        {plan && <span className="text-xs text-muted-foreground">· {FREQUENCY_LABELS[plan.frequency]} plan</span>}
                                    </div>
                                    {entries.map((d) => (
                                        <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                                            <span className="truncate text-foreground">{d.recipient}</span>
                                            {entries.length > 1 && <span className="tabular-nums text-muted-foreground">{fmt(d.amount)}</span>}
                                        </div>
                                    ))}
                                    {first.notes && <p className="text-xs text-muted-foreground truncate">{first.notes}</p>}
                                </div>
                                <div className="flex flex-col items-end justify-between">
                                    <p className="text-lg font-bold text-foreground tabular-nums">{fmt(total)}</p>
                                    <button
                                        onClick={() => run(deletePayment(paymentId), 'Removed')}
                                        aria-label="Delete payment"
                                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

            {payment && <PaymentForm defaults={payment} onClose={() => setPayment(null)} />}
            {planOpen && <PlanForm onClose={() => setPlanOpen(false)} />}
        </div>
    );
}
