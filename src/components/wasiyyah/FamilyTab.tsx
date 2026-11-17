'use client';

import { Users, Scale, Info } from 'lucide-react';
import { useWasiyyahStore } from '@/lib/wasiyyah-store';
import { useZakatStore } from '@/lib/store';
import { HEIR_META, HEIR_ORDER, type HeirKey, type Relative } from '@/lib/wasiyyah-types';
import type { WasiyyahSummary } from '@/lib/wasiyyah-summary';
import { fracToString } from '@/lib/faraid-engine';
import { AddButton, Field, Notice, RowList, Section, Select, TextInput, madhabLabel, newId, pct, useMoney } from './shared';

const GROUPS = ['Spouse', 'Parents & Grandparents', 'Children & Grandchildren', 'Siblings', 'Extended'] as const;

export default function FamilyTab({ summary }: { summary: WasiyyahSummary }) {
    const { data, update } = useWasiyyahStore();
    const money = useMoney(summary.baseCurrency);
    const madhab = useZakatStore((s) => s.settings.madhab);
    const gender = data.testator.gender;
    const counts = summary.heirCounts;

    const relationOptions = GROUPS.map((group) => ({
        label: group,
        options: HEIR_ORDER.filter((k) => HEIR_META[k].group === group).map((k) => {
            const meta = HEIR_META[k];
            const wrongGender = !!meta.onlyIf && meta.onlyIf !== gender;
            return { value: k, label: meta.label, disabled: wrongGender };
        }),
    }));

    const setRelatives = (relatives: Relative[]) => update({ relatives });
    const addRelative = () => {
        const firstFree = (['wife', 'husband', 'son', 'daughter'] as HeirKey[]).find((k) => {
            const meta = HEIR_META[k];
            if (meta.onlyIf && meta.onlyIf !== gender) return false;
            return meta.max === undefined || (counts[k] ?? 0) < meta.max;
        }) ?? 'son';
        setRelatives([...data.relatives, { id: newId(), name: '', relation: firstFree }]);
    };

    const allocationById = new Map(summary.allocations.map((a) => [a.relative.id, a]));
    const groupShares = summary.faraid.shares;

    return (
        <div className="space-y-6">
            <Section
                title="Family members"
                icon={Users}
                description="Add every living relative listed below, even if you think they will not inherit. The calculator works out who is excluded."
                action={<AddButton onClick={addRelative}>Add relative</AddButton>}
            >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-sm text-muted-foreground">I am</span>
                    {(['male', 'female'] as const).map((g) => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => update({ testator: { ...data.testator, gender: g } })}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${gender === g
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                : 'border-border text-muted-foreground hover:bg-secondary'}`}
                        >
                            {g === 'male' ? 'Male' : 'Female'}
                        </button>
                    ))}
                    <span className="text-xs text-muted-foreground">— decides whether a husband or wives inherit</span>
                </div>

                <RowList
                    items={data.relatives}
                    onChange={setRelatives}
                    itemLabel="relative"
                    empty="No relatives yet. Start with your spouse, parents and children."
                    render={(r, set) => {
                        const alloc = allocationById.get(r.id);
                        const meta = HEIR_META[r.relation];
                        const notApplicable = !!meta.onlyIf && meta.onlyIf !== gender;
                        const overMax = !notApplicable && alloc && !alloc.share && summary.faraid.shares.some((s) => s.key === r.relation);
                        const blocked = alloc?.share?.basis === 'blocked';
                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_auto] gap-3 items-end">
                                <Field label="Name">
                                    <TextInput value={r.name} placeholder="Full name" onChange={(e) => set({ name: e.target.value })} />
                                </Field>
                                <Field label="Relation to you">
                                    <Select value={r.relation} onChange={(v) => set({ relation: v })} options={relationOptions} />
                                </Field>
                                <div className="flex items-center gap-3 sm:justify-end sm:min-w-[11rem]">
                                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                        <input type="checkbox" checked={!!r.isMinor} onChange={(e) => set({ isMinor: e.target.checked })} className="accent-emerald-600" />
                                        Minor
                                    </label>
                                    <div className="text-right">
                                        {notApplicable ? (
                                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Not applicable</span>
                                        ) : overMax ? (
                                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Over limit</span>
                                        ) : blocked ? (
                                            <span className="px-2 py-0.5 rounded-md bg-secondary text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Excluded</span>
                                        ) : alloc ? (
                                            <>
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500">{pct(alloc.fraction)}</p>
                                                <p className="text-xs text-muted-foreground">{money(alloc.amount)}</p>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                />
            </Section>

            {groupShares.length > 0 && (
                <Section
                    title="How the shares are worked out"
                    icon={Scale}
                    description={`Applied using the ${madhabLabel(madhab)} school from your settings.`}
                >
                    {(summary.faraid.awl || summary.faraid.radd) && (
                        <div className="mb-4">
                            <Notice>
                                {summary.faraid.awl && <><strong>ʿAwl:</strong> the fixed shares add up to more than the whole, so each is reduced proportionally. </>}
                                {summary.faraid.radd && <><strong>Radd:</strong> no residuary heir remains, so the surplus returns to the blood heirs in proportion to their shares (never to the spouse).</>}
                            </Notice>
                        </div>
                    )}
                    <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                                    <th className="py-2 px-1 font-semibold">Heir</th>
                                    <th className="py-2 px-1 font-semibold text-right">Quranic share</th>
                                    <th className="py-2 px-1 font-semibold text-right">Final (group)</th>
                                    <th className="py-2 px-1 font-semibold text-right">Each</th>
                                    <th className="py-2 px-1 font-semibold">Why</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupShares.map((s) => {
                                    const meta = HEIR_META[s.key];
                                    const blocked = s.basis === 'blocked';
                                    return (
                                        <tr key={s.key} className={`border-b border-border/60 align-top ${blocked ? 'text-muted-foreground' : ''}`}>
                                            <td className="py-2.5 px-1 font-medium whitespace-nowrap">
                                                {s.count > 1 ? `${s.count} × ${meta.plural}` : meta.label.split(' (')[0]}
                                                <span className="block text-xs text-muted-foreground font-normal" lang="ar">{meta.arabic}</span>
                                            </td>
                                            <td className="py-2.5 px-1 text-right tabular-nums">
                                                {blocked ? '—' : s.fard.n ? fracToString(s.fard) : 'Residue'}
                                            </td>
                                            <td className="py-2.5 px-1 text-right tabular-nums font-semibold">{blocked ? '—' : fracToString(s.share)}</td>
                                            <td className="py-2.5 px-1 text-right tabular-nums">{blocked || s.count === 1 ? '' : fracToString(s.perPerson)}</td>
                                            <td className="py-2.5 px-1 text-xs leading-relaxed min-w-[14rem]">{s.reason}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {summary.faraid.warnings.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {summary.faraid.warnings.map((w) => (
                                <Notice key={w} tone="warn"><Info size={14} className="inline mr-1.5 -mt-0.5" />{w}</Notice>
                            ))}
                        </div>
                    )}
                </Section>
            )}

            <Notice>
                Only Muslim relatives inherit from a Muslim, and someone who unlawfully caused the death is excluded. Leave out anyone in those categories, and ask a scholar about missing persons or an unborn child.
            </Notice>
        </div>
    );
}
