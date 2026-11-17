'use client';

import Link from 'next/link';
import { Landmark, HandCoins, Flower2 } from 'lucide-react';
import { useWasiyyahStore } from '@/lib/wasiyyah-store';
import { useZakatStore } from '@/lib/store';
import {
    DEBTS_TO_ALLAH,
    type EstateDebt,
    type EstateDebtKind,
    type EstateItem,
    type EstateItemCategory,
} from '@/lib/wasiyyah-types';
import type { WasiyyahSummary } from '@/lib/wasiyyah-summary';
import { AddButton, CurrencySelect, Field, Notice, NumberInput, RowList, Section, Select, TextInput, Toggle, newId, useMoney } from './shared';

const CATEGORY_LABELS: Record<EstateItemCategory, string> = {
    Real_Estate: 'Home / real estate',
    Vehicle: 'Vehicle',
    Business: 'Business share',
    Life_Insurance: 'Life insurance payout',
    Personal_Effects: 'Personal effects / jewellery',
    Receivable: 'Money owed to me',
    Other: 'Other',
};

const DEBT_LABELS: Record<EstateDebtKind, string> = {
    Creditor: 'Debt to a person / lender',
    Deferred_Mahr: 'Unpaid mahr (dowry)',
    Zakat: 'Unpaid zakat',
    Kaffarah: 'Kaffarah (expiation)',
    Fidya: 'Fidya (missed fasts / prayers)',
    Hajj: 'Obligatory hajj not performed',
    Other: 'Other',
};

export default function EstateTab({ summary }: { summary: WasiyyahSummary }) {
    const { data, update } = useWasiyyahStore();
    const madhab = useZakatStore((s) => s.settings.madhab);
    const money = useMoney(summary.baseCurrency);
    const base = summary.baseCurrency;

    return (
        <div className="space-y-6">
            <Section
                title="What you own"
                icon={Landmark}
                description="Your Zakat assets are counted automatically. Add anything else you own that Zakat doesn't cover."
                action={
                    <AddButton onClick={() => update({ estateItems: [...data.estateItems, { id: newId(), name: '', category: 'Real_Estate', value: 0, currency: base }] })}>
                        Add item
                    </AddButton>
                }
            >
                <div className="rounded-lg border border-border bg-background/40 p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                    <Toggle
                        checked={data.includeZakatAssets}
                        onChange={(v) => update({ includeZakatAssets: v })}
                        label="Include my Zakat assets"
                        hint={summary.zakatYear
                            ? <>Gross value of everything on the <Link href="/dashboard/assets" className="underline hover:text-foreground">Assets</Link> page for {summary.zakatYear}.</>
                            : 'No Zakat assets recorded yet.'}
                    />
                    <span className="text-sm font-semibold text-foreground tabular-nums">{money(summary.zakatAssetsTotal)}</span>
                </div>

                <RowList<EstateItem>
                    items={data.estateItems}
                    onChange={(estateItems) => update({ estateItems })}
                    itemLabel="item"
                    empty="Homes, cars, business shares, life insurance and personal valuables go here."
                    render={(item, set) => (
                        <div className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr_6rem] gap-3">
                            <Field label="Description" className="col-span-2 sm:col-span-1">
                                <TextInput value={item.name} placeholder="e.g. Family home, 12 Oak St" onChange={(e) => set({ name: e.target.value })} />
                            </Field>
                            <Field label="Type">
                                <Select value={item.category} onChange={(category) => set({ category })}
                                    options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value: value as EstateItemCategory, label }))} />
                            </Field>
                            <Field label="Value">
                                <NumberInput value={item.value} onChange={(value) => set({ value })} />
                            </Field>
                            <Field label="Currency">
                                <CurrencySelect value={item.currency} onChange={(currency) => set({ currency })} />
                            </Field>
                        </div>
                    )}
                />
                <div className="flex justify-between text-sm font-semibold mt-4 px-1">
                    <span>Gross estate</span>
                    <span className="tabular-nums">{money(summary.waterfall.grossEstate)}</span>
                </div>
            </Section>

            <Section
                title="Debts and obligations"
                icon={HandCoins}
                description="Debts are paid before any bequest or inheritance."
                action={
                    <AddButton onClick={() => update({ debts: [...data.debts, { id: newId(), kind: 'Creditor', creditor: '', amount: 0, currency: base }] })}>
                        Add debt
                    </AddButton>
                }
            >
                <div className="rounded-lg border border-border bg-background/40 p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                    <Toggle
                        checked={data.includeLiabilities}
                        onChange={(v) => update({ includeLiabilities: v })}
                        label="Include my recorded liabilities"
                        hint={<>Full outstanding balance of everything on the <Link href="/dashboard/liabilities" className="underline hover:text-foreground">Liabilities</Link> page{summary.zakatYear ? ` for ${summary.zakatYear}` : ''}.</>}
                    />
                    <span className="text-sm font-semibold text-foreground tabular-nums">{money(summary.liabilitiesTotal)}</span>
                </div>

                <RowList<EstateDebt>
                    items={data.debts}
                    onChange={(debts) => update({ debts })}
                    itemLabel="debt"
                    empty="Add unpaid mahr, personal loans, or obligations to Allah such as missed zakat or fidya."
                    render={(d, set) => (
                        <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1.2fr_1fr_6rem] gap-3">
                            <Field label="Kind">
                                <Select value={d.kind} onChange={(kind) => set({ kind })}
                                    options={[
                                        { label: 'Owed to people', options: (['Creditor', 'Deferred_Mahr', 'Other'] as EstateDebtKind[]).map((k) => ({ value: k, label: DEBT_LABELS[k] })) },
                                        { label: 'Owed to Allah', options: DEBTS_TO_ALLAH.map((k) => ({ value: k, label: DEBT_LABELS[k] })) },
                                    ]} />
                            </Field>
                            <Field label="Owed to / details">
                                <TextInput value={d.creditor} placeholder="Name or note" onChange={(e) => set({ creditor: e.target.value })} />
                            </Field>
                            <Field label="Amount">
                                <NumberInput value={d.amount} onChange={(amount) => set({ amount })} />
                            </Field>
                            <Field label="Currency">
                                <CurrencySelect value={d.currency} onChange={(currency) => set({ currency })} />
                            </Field>
                        </div>
                    )}
                />

                {summary.waterfall.debtsToAllah > 0 && (
                    <div className="mt-4">
                        <Notice>
                            {madhab === 'Hanafi'
                                ? <>In the Hanafi school, obligations to Allah ({money(summary.waterfall.debtsToAllah)}) are paid only because you instruct it here, and they come out of the one-third bequest allowance.</>
                                : <>In the {madhab === 'Shafi' ? "Shafi'i" : madhab} school, obligations to Allah ({money(summary.waterfall.debtsToAllah)}) are debts on the estate and are paid before bequests.</>}
                        </Notice>
                    </div>
                )}
            </Section>

            <Section title="Funeral costs" icon={Flower2} description="A modest burial following the sunnah is paid first, before debts.">
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_6rem] gap-3 max-w-sm">
                    <Field label="Estimated cost">
                        <NumberInput value={data.funeral.estimatedCost} onChange={(estimatedCost) => update({ funeral: { ...data.funeral, estimatedCost } })} />
                    </Field>
                    <Field label="Currency">
                        <CurrencySelect value={data.funeral.currency} onChange={(currency) => update({ funeral: { ...data.funeral, currency } })} />
                    </Field>
                </div>
            </Section>
        </div>
    );
}
