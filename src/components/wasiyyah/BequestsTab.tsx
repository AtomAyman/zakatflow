'use client';

import { Gift } from 'lucide-react';
import { useWasiyyahStore } from '@/lib/wasiyyah-store';
import type { Bequest, BequestBeneficiaryKind } from '@/lib/wasiyyah-types';
import type { WasiyyahSummary } from '@/lib/wasiyyah-summary';
import { AddButton, CurrencySelect, Field, Notice, NumberInput, RowList, Section, Select, TextInput, newId, useMoney } from './shared';

const KIND_LABELS: Record<BequestBeneficiaryKind, string> = {
    Charity: 'Charity / masjid',
    Waqf: 'Waqf (endowment)',
    Person: 'Person (not an heir)',
    Other: 'Other',
};

export default function BequestsTab({ summary }: { summary: WasiyyahSummary }) {
    const { data, update } = useWasiyyahStore();
    const money = useMoney(summary.baseCurrency);
    const w = summary.waterfall;
    const used = w.bequestCap > 0 ? Math.min(1, w.bequestsRequested / w.bequestCap) : 0;
    const amountById = new Map(summary.bequestAmounts.map((b) => [b.id, b]));
    const hanafiDebtShare = w.bequestsRequested - summary.bequestAmounts.reduce((s, b) => s + b.requested, 0);

    return (
        <div className="space-y-6">
            <Section
                title="Bequests (wasiyyah)"
                icon={Gift}
                description="You may leave up to one third of your estate, after funeral costs and debts, to people who don't inherit and to good causes."
                action={
                    <AddButton onClick={() => update({ bequests: [...data.bequests, { id: newId(), beneficiary: '', kind: 'Charity', amountType: 'percent', value: 0, currency: summary.baseCurrency }] })}>
                        Add bequest
                    </AddButton>
                }
            >
                <div className="mb-5">
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-foreground">One-third allowance used</span>
                        <span className={`font-semibold tabular-nums ${w.bequestsOverCap ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                            {money(w.bequestsRequested)} of {money(w.bequestCap)}
                        </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)} aria-label="One-third allowance used">
                        <div className={`h-full rounded-full transition-all ${w.bequestsOverCap ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${used * 100}%` }} />
                    </div>
                    {hanafiDebtShare > 0.5 && (
                        <p className="text-xs text-muted-foreground mt-1.5">Includes {money(hanafiDebtShare)} of obligations to Allah, which the Hanafi school pays from this third.</p>
                    )}
                </div>

                <RowList<Bequest>
                    items={data.bequests}
                    onChange={(bequests) => update({ bequests })}
                    itemLabel="bequest"
                    empty="For example: 10% to the local masjid, or a fixed sum to a step-child or a friend."
                    render={(b, set) => {
                        const amt = amountById.get(b.id);
                        return (
                            <div className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_7rem_1fr_auto] gap-3 items-end">
                                <Field label="Beneficiary" className="col-span-2 sm:col-span-1">
                                    <TextInput value={b.beneficiary} placeholder="Name of person or organisation" onChange={(e) => set({ beneficiary: e.target.value })} />
                                </Field>
                                <Field label="Type">
                                    <Select value={b.kind} onChange={(kind) => set({ kind })}
                                        options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value: value as BequestBeneficiaryKind, label }))} />
                                </Field>
                                <Field label="Amount as">
                                    <Select value={b.amountType} onChange={(amountType) => set({ amountType })}
                                        options={[{ value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed' }]} />
                                </Field>
                                {b.amountType === 'percent' ? (
                                    <Field label="Percent">
                                        <NumberInput value={b.value} max={33.33} step={0.5} onChange={(value) => set({ value })} />
                                    </Field>
                                ) : (
                                    <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                                        <Field label="Amount"><NumberInput value={b.value} onChange={(value) => set({ value })} /></Field>
                                        <Field label="Currency"><CurrencySelect value={b.currency} onChange={(currency) => set({ currency })} /></Field>
                                    </div>
                                )}
                                <div className="text-right text-sm col-span-2 sm:col-span-1 sm:min-w-[6rem]">
                                    <p className="font-semibold tabular-nums text-foreground">{money(amt?.allowed ?? 0)}</p>
                                    {amt && amt.allowed + 0.5 < amt.requested && (
                                        <p className="text-xs text-red-600 dark:text-red-400">reduced from {money(amt.requested)}</p>
                                    )}
                                </div>
                            </div>
                        );
                    }}
                />

                <div className="mt-4 space-y-2">
                    {w.bequestsOverCap && (
                        <Notice tone="danger">
                            Your bequests add up to more than one third. Unless your heirs agree after your death, each one will be reduced proportionally, as shown above.
                        </Notice>
                    )}
                    {summary.bequestsToHeirs.length > 0 && (
                        <Notice tone="warn">
                            <strong>{summary.bequestsToHeirs.map((r) => r.name).join(', ')}</strong> already {summary.bequestsToHeirs.length > 1 ? 'inherit' : 'inherits'} a share.
                            The Prophet ﷺ said “there is no bequest for an heir”, so this bequest is valid only if the other heirs consent.
                        </Notice>
                    )}
                </div>
            </Section>
        </div>
    );
}
