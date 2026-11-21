'use client';

import { useMemo, useState } from 'react';
import { Percent, Plus, Trash2, HandCoins, Info } from 'lucide-react';
import { useZakatStore } from '@/lib/store';
import { interestBalance, interestByAccount } from '@/lib/donations';
import { convertToBaseCurrency } from '@/lib/price-service';
import type { InterestEntry } from '@/lib/types';
import PaymentForm from '@/components/donations/PaymentForm';
import InterestForm from '@/components/donations/InterestForm';

const PERIOD_LABEL: Record<InterestEntry['period'], string> = { month: 'Month', year: 'Year', other: 'Other' };

export default function InterestPage() {
    const { interest, donations, assets, settings, prices, selectedYear, saveInterest, deleteInterest } = useZakatStore();
    const [adding, setAdding] = useState(false);
    const [givingAway, setGivingAway] = useState(false);

    const base = settings.baseCurrency || 'USD';
    const fmt = (n: number, currency = base) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

    const allTime = useMemo(() => interestBalance(interest, donations, base, prices.exchangeRates), [interest, donations, base, prices]);
    const thisYear = useMemo(
        () => interest.filter((e) => e.zakatYear === selectedYear).reduce((s, e) => s + convertToBaseCurrency(e.amount, e.currency, base, prices.exchangeRates), 0),
        [interest, selectedYear, base, prices]
    );
    const accounts = useMemo(() => interestByAccount(interest, base, prices.exchangeRates), [interest, base, prices]);
    const entries = useMemo(() => [...interest].sort((a, b) => b.date.localeCompare(a.date)), [interest]);
    const interestAccounts = assets.filter((a) => a.earnsInterest && a.zakatYear === selectedYear);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Percent size={24} className="text-amber-500" />
                        Interest
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground">Track interest your accounts paid you, and give all of it away</p>
                </div>
                <div className="flex gap-2">
                    {allTime.outstanding > 0 && (
                        <button onClick={() => setGivingAway(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 shadow-sm">
                            <HandCoins size={16} /> Give it away
                        </button>
                    )}
                    <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-secondary border border-border hover:bg-secondary/80">
                        <Plus size={16} /> Add interest
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-foreground flex gap-3">
                <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                    Interest (ribā) is not yours to keep. Give <strong>all</strong> of it away: it does not count as Zakat or Sadaqah, and
                    is given without expecting reward. Until it is given away it is not counted as your wealth, so it is taken off your
                    Zakatable total. &ldquo;Interest&rdquo; added to a mandatory employer pension is not ribā and does not belong here.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card shadow-sm p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Still to give away</p>
                    <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-500">{fmt(allTime.outstanding)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card shadow-sm p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Earned (all time)</p>
                    <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(allTime.earned)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fmt(thisYear)} in {selectedYear}</p>
                </div>
                <div className="rounded-xl border border-border bg-card shadow-sm p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Given away</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500">{fmt(allTime.givenAway)}</p>
                </div>
            </div>

            {accounts.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">By account</h2>
                    <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
                        {accounts.map((a) => (
                            <div key={a.key} className="flex items-center justify-between px-4 py-3 text-sm">
                                <span className="text-foreground">{a.accountName}</span>
                                <span className="tabular-nums font-medium">{fmt(a.earned)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Entries</h2>
                {entries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
                        No interest recorded. Turn on &ldquo;Earns interest&rdquo; when you add a bank account, or add an entry here from your statement.
                    </div>
                ) : (
                    entries.map((e) => (
                        <div key={e.id} className="group rounded-xl border border-border bg-card shadow-sm p-4 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{e.accountName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {PERIOD_LABEL[e.period]} ending{' '}
                                    {new Date(`${e.date}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                                    {' '}· Zakat year {e.zakatYear}
                                    {e.notes && ` · ${e.notes}`}
                                </p>
                            </div>
                            <p className="font-bold tabular-nums">{fmt(e.amount, e.currency)}</p>
                            <button onClick={() => deleteInterest(e.id).catch(() => {})} aria-label="Delete entry" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </section>

            {adding && (
                <InterestForm
                    accounts={interestAccounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
                    defaultCurrency={base}
                    zakatYear={selectedYear}
                    onSave={(entry) => saveInterest(entry).catch(() => {})}
                    onClose={() => setAdding(false)}
                />
            )}
            {givingAway && (
                <PaymentForm
                    defaults={{ category: 'Interest', amount: allTime.outstanding, title: 'Give away interest' }}
                    onClose={() => setGivingAway(false)}
                />
            )}
        </div>
    );
}
