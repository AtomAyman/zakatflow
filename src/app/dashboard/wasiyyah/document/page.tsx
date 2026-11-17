'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { useZakatStore } from '@/lib/store';
import { useWasiyyahSummary } from '@/components/wasiyyah/useWasiyyahSummary';
import { madhabLabel, useMoney } from '@/components/wasiyyah/shared';
import { HEIR_META, DEBTS_TO_ALLAH, type Contact } from '@/lib/wasiyyah-types';
import { fracToString } from '@/lib/faraid-engine';

const PRINT_CSS = `
@media print {
  aside, body button.fixed, .no-print { display: none !important; }
  main { margin-left: 0 !important; }
  main > div { padding: 0 !important; }
  body, .bg-surface { background: #fff !important; }
  .will-doc { box-shadow: none !important; border: 0 !important; padding: 0 !important; color: #000 !important; }
  .will-doc * { color: #000 !important; }
  @page { margin: 2cm; }
}`;

const blank = (s?: string, width = '14rem') =>
    s?.trim() ? s : <span className="inline-block border-b border-current align-bottom" style={{ width }}>&nbsp;</span>;

function names(list: Contact[]) {
    return list.filter((c) => c.name.trim()).map((c) => `${c.name}${c.relation ? ` (${c.relation})` : ''}`);
}

export default function WasiyyahDocumentPage() {
    const { summary, data, isReady } = useWasiyyahSummary();
    const madhab = useZakatStore((s) => s.settings.madhab);
    const money = useMoney(summary.baseCurrency);
    const t = data.testator;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const executors = names(data.executors);
    const guardians = names(data.guardians);
    const debts = data.debts.filter((d) => d.amount > 0 || d.creditor.trim());
    const bequests = data.bequests.filter((b) => b.beneficiary.trim() && b.value > 0);
    const heirs = summary.faraid.shares.filter((s) => s.basis !== 'blocked' && s.share.n > 0);
    const witnessSlots = Math.max(2, data.witnesses.length);

    if (!isReady) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> Loading your will…
            </div>
        );
    }

    let clause = 0;
    const heading = (text: string) => <h2 className="text-base font-bold mt-8 mb-2">{++clause}. {text}</h2>;

    return (
        <div className="space-y-4">
            <style>{PRINT_CSS}</style>
            <div className="no-print flex flex-wrap items-center justify-between gap-3 max-w-3xl mx-auto">
                <Link href="/dashboard/wasiyyah" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={15} /> Back to planner
                </Link>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Printer size={16} /> Print or save as PDF
                </button>
            </div>

            <div className="no-print max-w-3xl mx-auto rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed">
                <strong>Draft only.</strong> Have this reviewed by a scholar and by a lawyer in your jurisdiction. Most countries require specific signing and witnessing formalities, and many Muslims sign a secular will that mirrors these wishes.
            </div>

            <article className="will-doc max-w-3xl mx-auto rounded-xl border border-border bg-card text-card-foreground shadow-sm px-6 sm:px-12 py-10 font-serif text-[15px] leading-7">
                <p className="text-center text-xl mb-1" lang="ar" dir="rtl">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
                <p className="text-center text-sm italic mb-6">In the name of Allah, the Most Gracious, the Most Merciful</p>
                <h1 className="text-center text-2xl font-bold tracking-wide uppercase">Islamic Will (Wasiyyah)</h1>
                <p className="text-center text-sm mt-1 mb-8">Last Will and Testament of {blank(t.fullName)}</p>

                <p>
                    I, {blank(t.fullName)}{t.dateOfBirth ? `, born ${new Date(t.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                    {t.address ? `, of ${t.address}` : ''}{t.jurisdiction ? `, ${t.jurisdiction}` : ''}, being of sound mind, make this will freely and of my own accord.
                </p>
                <p className="mt-3">
                    I bear witness that there is no god but Allah, alone, without partner, and that Muhammad ﷺ is His servant and Messenger.
                    I bear witness that the Hour is coming, and that Allah will raise those in the graves. I ask my family and all who survive me
                    to fear Allah, to keep the ties of kinship, and to follow the Quran and the Sunnah.
                </p>

                {heading('Revocation')}
                <p>I revoke all earlier wills and codicils made by me, to the extent they conflict with this will.</p>

                {heading('Executors')}
                {executors.length ? (
                    <p>I appoint {executors.join(executors.length > 2 ? ', ' : ' and ')} as executor{executors.length > 1 ? 's' : ''} of this will{executors.length > 1 ? ', the first named to act and the others as alternates if the first cannot or will not act' : ''}.</p>
                ) : (
                    <p>I appoint {blank(undefined)} as executor of this will.</p>
                )}

                {heading('Funeral and burial')}
                <p>
                    I direct that my body be washed, shrouded, prayed over and buried promptly according to the Sunnah, by Muslims, without
                    extravagance{data.funeral.burialLocation ? `, in ${data.funeral.burialLocation}` : ''}, and that no post-mortem be carried out unless required by law.
                    {' '}My funeral expenses are to be paid first from my estate.
                </p>
                {data.funeral.wishes?.trim() && <p className="mt-2 whitespace-pre-line">{data.funeral.wishes}</p>}

                {heading('Debts and obligations')}
                <p>After my funeral expenses, my executors shall pay all my debts in full, including:</p>
                {debts.length > 0 || summary.liabilitiesTotal > 0 ? (
                    <ul className="list-disc pl-6 mt-2">
                        {summary.liabilitiesTotal > 0 && <li>My outstanding loans and bills, estimated at {money(summary.liabilitiesTotal)} as of today;</li>}
                        {debts.map((d) => (
                            <li key={d.id}>
                                {d.creditor || d.kind.replace('_', ' ')} — {d.currency} {d.amount.toLocaleString()}
                                {DEBTS_TO_ALLAH.includes(d.kind) && ` (owed to Allah: ${d.kind.toLowerCase()}${madhab === 'Hanafi' ? ', to be paid from the one-third bequest' : ''})`};
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2">any debts outstanding at my death.</p>
                )}

                {heading('Bequests')}
                {bequests.length > 0 ? (
                    <>
                        <p>From the remainder after funeral costs and debts, and not exceeding one third of it in total, I leave:</p>
                        <ul className="list-disc pl-6 mt-2">
                            {bequests.map((b) => (
                                <li key={b.id}>
                                    {b.amountType === 'percent' ? `${b.value}% of my net estate` : `${b.currency} ${b.value.toLocaleString()}`} to {b.beneficiary}
                                    {b.kind === 'Waqf' ? ', as a continuing charity (waqf)' : ''};
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2">If these bequests together exceed one third, each shall be reduced in proportion, unless all my heirs, being adults of sound mind, freely agree otherwise after my death.</p>
                    </>
                ) : (
                    <p>I make no bequests beyond those stated above.</p>
                )}

                {heading('Distribution of the remainder')}
                <p>
                    The whole of the remainder of my estate shall be distributed among my heirs who survive me, in the shares fixed by Islamic law
                    (faraid) according to the {madhabLabel(madhab)} school, as determined at the time of my death by a qualified scholar.
                </p>
                {heirs.length > 0 && (
                    <>
                        <p className="mt-2">For guidance, if I were to die today my heirs and their shares would be:</p>
                        <table className="w-full mt-3 text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-current/30 text-left">
                                    <th className="py-1.5 font-semibold">Heir</th>
                                    <th className="py-1.5 font-semibold text-right">Share</th>
                                    <th className="py-1.5 font-semibold text-right">Approx. value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.allocations.filter((a) => a.fraction > 0).map((a) => (
                                    <tr key={a.relative.id} className="border-b border-current/10">
                                        <td className="py-1.5">{a.relative.name || '—'} ({HEIR_META[a.relative.relation].label.split(' (')[0].toLowerCase()})</td>
                                        <td className="py-1.5 text-right tabular-nums">{a.share ? fracToString(a.share.perPerson) : ''}</td>
                                        <td className="py-1.5 text-right tabular-nums">{money(a.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {(guardians.length > 0 || data.relatives.some((r) => r.isMinor)) && (
                    <>
                        {heading('Guardianship')}
                        <p>
                            If any of my children are minors at my death, I appoint {guardians.length ? guardians.join(' and ') : blank(undefined)} as
                            their guardian{guardians.length > 1 ? 's' : ''}, and ask that they be raised as Muslims.
                        </p>
                    </>
                )}

                {data.personalMessage.trim() && (
                    <>
                        {heading('Advice to my family')}
                        <p className="whitespace-pre-line">{data.personalMessage}</p>
                    </>
                )}

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-10 text-sm break-inside-avoid">
                    <div>
                        <div className="border-b border-current h-10" />
                        <p className="mt-1">Signature of {t.fullName || 'testator'}</p>
                        <p className="mt-4">Date: {today}</p>
                    </div>
                    {Array.from({ length: witnessSlots }).map((_, i) => {
                        const w = data.witnesses[i];
                        return (
                            <div key={i}>
                                <div className="border-b border-current h-10" />
                                <p className="mt-1">Witness {i + 1}: {w?.name || ''}</p>
                                {w?.contact && <p className="text-xs">{w.contact}</p>}
                            </div>
                        );
                    })}
                </div>
            </article>
        </div>
    );
}
