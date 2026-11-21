'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, HandCoins } from 'lucide-react';
import { useZakatStore } from '@/lib/store';
import { planProgress, zakatPaidForYear, FREQUENCY_LABELS } from '@/lib/donations';
import PaymentForm from './PaymentForm';
import PlanForm from './PlanForm';

/**
 * After Zakat is calculated: how much is due, paid and left for the selected
 * year, and "pay once or set up a plan?" when something is still owed.
 */
export default function ZakatPaymentCard({ linkToLedger = false }: { linkToLedger?: boolean }) {
    const { dashboard, history, donations, donationPlans, selectedYear, settings } = useZakatStore();
    const [modal, setModal] = useState<'pay' | 'plan' | null>(null);

    const finalized = history.find((h) => h.year === selectedYear);
    const due = finalized ? finalized.zakatPaid : dashboard.zakatDue;
    const paid = useMemo(() => zakatPaidForYear(donations, selectedYear), [donations, selectedYear]);
    const remaining = Math.max(0, Math.round((due - paid) * 100) / 100);
    const today = new Date().toISOString().slice(0, 10);
    const plan = donationPlans.find((p) => p.zakatYear === selectedYear && p.category === 'Zakat' && p.status === 'active');
    const progress = plan ? planProgress(plan, donations, today) : undefined;

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.baseCurrency || 'USD' }).format(n);

    if (!(due > 0)) return null;

    return (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zakat for {selectedYear}</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{fmt(due)}</p>
                </div>
                <div className="text-right text-sm">
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">Paid {fmt(paid)}</p>
                    <p className="text-muted-foreground tabular-nums">Left {fmt(remaining)}</p>
                </div>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (paid / due) * 100)}%` }} />
            </div>

            {remaining <= 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> Your Zakat for {selectedYear} is fully paid. May Allah accept it.
                </p>
            ) : plan && progress ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock size={16} />
                        {FREQUENCY_LABELS[plan.frequency]} plan
                        {progress.next && (
                            <>
                                {' '}· next {fmt(progress.next.amount)} on{' '}
                                {new Date(`${progress.next.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                            </>
                        )}
                        {progress.overdue > 0 && <span className="text-amber-600"> · {progress.overdue} overdue</span>}
                    </p>
                    {linkToLedger ? (
                        <Link href="/dashboard/donations" className="font-medium text-rose-600 hover:text-rose-700">
                            Open donation ledger →
                        </Link>
                    ) : null}
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">How would you like to pay?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={() => setModal('pay')}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                        >
                            <HandCoins size={16} /> Pay it all now
                        </button>
                        <button
                            onClick={() => setModal('plan')}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-secondary border border-border hover:bg-secondary/80"
                        >
                            <CalendarClock size={16} /> Pay in instalments
                        </button>
                    </div>
                </div>
            )}

            {modal === 'pay' && (
                <PaymentForm
                    defaults={{ category: 'Zakat', amount: remaining, title: `Pay Zakat for ${selectedYear}` }}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === 'plan' && <PlanForm defaultTotal={remaining} defaultCategory="Zakat" onClose={() => setModal(null)} />}
        </div>
    );
}
