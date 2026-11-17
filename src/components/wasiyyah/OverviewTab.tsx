'use client';

import { CheckCircle2, Circle, AlertTriangle, PieChart } from 'lucide-react';
import { HEIR_META } from '@/lib/wasiyyah-types';
import type { WasiyyahSummary } from '@/lib/wasiyyah-summary';
import { Notice, Section, pct, useMoney } from './shared';

const SHARE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#84cc16', '#6366f1', '#14b8a6'];

export default function OverviewTab({ summary, onNavigate }: { summary: WasiyyahSummary; onNavigate: (tab: string) => void }) {
    const money = useMoney(summary.baseCurrency);
    const w = summary.waterfall;
    const done = summary.checklist.filter((c) => c.done).length;

    const steps = [
        { label: 'Gross estate', value: w.grossEstate, tone: 'text-foreground', tab: 'estate' },
        { label: 'Funeral costs', value: -w.funeral, tone: 'text-muted-foreground', tab: 'estate' },
        { label: 'Debts to people', value: -w.debtsToPeople, tone: 'text-muted-foreground', tab: 'estate' },
        ...(w.debtsToAllah > 0 && w.netEstate !== w.grossEstate - w.funeral - w.debtsToPeople
            ? [{ label: 'Debts to Allah', value: -w.debtsToAllah, tone: 'text-muted-foreground', tab: 'estate' }]
            : []),
        { label: 'Bequests (max ⅓)', value: -w.bequestsAllowed, tone: 'text-muted-foreground', tab: 'bequests' },
    ];

    const heirs = summary.allocations.filter((a) => a.fraction > 0);
    const unallocated = summary.faraid.unallocated.n / summary.faraid.unallocated.d;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
                <Section title="How your estate would be divided" icon={PieChart} description="Values are in your base currency, using today's figures.">
                    <ol className="space-y-1">
                        {steps.map((s) => (
                            <li key={s.label}>
                                <button type="button" onClick={() => onNavigate(s.tab)}
                                    className="w-full flex justify-between items-center py-2 px-2 -mx-2 rounded-md hover:bg-secondary/60 text-sm transition-colors">
                                    <span className={s.tone}>{s.label}</span>
                                    <span className={`tabular-nums font-medium ${s.tone}`}>{s.value < 0 ? '− ' : ''}{money(Math.abs(s.value))}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                    <div className="flex justify-between items-center border-t border-border mt-2 pt-3 px-0">
                        <span className="text-sm font-semibold text-foreground">Inheritance for heirs</span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{money(w.inheritance)}</span>
                    </div>

                    {heirs.length > 0 && (
                        <div className="mt-6">
                            <div className="flex h-3 rounded-full overflow-hidden bg-secondary" aria-hidden>
                                {heirs.map((a, i) => (
                                    <div key={a.relative.id} style={{ width: `${a.fraction * 100}%`, background: SHARE_COLORS[i % SHARE_COLORS.length] }} />
                                ))}
                            </div>
                            <ul className="mt-4 space-y-2">
                                {heirs.map((a, i) => (
                                    <li key={a.relative.id} className="flex items-center gap-3 text-sm">
                                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: SHARE_COLORS[i % SHARE_COLORS.length] }} />
                                        <span className="flex-1 min-w-0 truncate">
                                            <span className="font-medium text-foreground">{a.relative.name || 'Unnamed'}</span>
                                            <span className="text-muted-foreground"> · {HEIR_META[a.relative.relation].label.split(' (')[0]}</span>
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">{pct(a.fraction)}</span>
                                        <span className="tabular-nums font-semibold text-foreground w-24 text-right">{money(a.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {heirs.length === 0 && (
                        <button type="button" onClick={() => onNavigate('family')} className="mt-6 w-full">
                            <Notice>Add your family members to see each heir&apos;s share.</Notice>
                        </button>
                    )}
                </Section>

                <Section title="Your will" description={`${done} of ${summary.checklist.length} sections complete`}>
                    <ul className="space-y-2.5">
                        {summary.checklist.map((c) => (
                            <li key={c.label} className="flex items-center gap-2.5 text-sm">
                                {c.done
                                    ? <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                                    : <Circle size={17} className="text-muted-foreground/60 flex-shrink-0" />}
                                <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            </div>

            {(w.bequestsOverCap || summary.bequestsToHeirs.length > 0 || summary.faraid.warnings.length > 0 || unallocated > 0) && (
                <div className="space-y-2">
                    {w.bequestsOverCap && (
                        <Notice tone="danger"><AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />Bequests exceed one third and will be reduced proportionally.</Notice>
                    )}
                    {summary.bequestsToHeirs.length > 0 && (
                        <Notice tone="warn"><AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />A bequest names someone who already inherits. It needs the other heirs&apos; consent.</Notice>
                    )}
                    {summary.faraid.warnings.map((m) => (
                        <Notice key={m} tone="warn"><AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />{m}</Notice>
                    ))}
                </div>
            )}
        </div>
    );
}
