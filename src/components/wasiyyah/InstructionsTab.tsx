'use client';

import { UserRound, ShieldCheck, Baby, PenLine, Flower2, MessageSquareHeart } from 'lucide-react';
import { useWasiyyahStore } from '@/lib/wasiyyah-store';
import type { Contact, WasiyyahData } from '@/lib/wasiyyah-types';
import { AddButton, Field, RowList, Section, TextInput, inputClass, newId } from './shared';

type ContactKey = 'executors' | 'guardians' | 'witnesses';

function ContactList({ field, noun, empty }: { field: ContactKey; noun: string; empty: string }) {
    const { data, update } = useWasiyyahStore();
    return (
        <RowList<Contact>
            items={data[field]}
            onChange={(items) => update({ [field]: items } as Partial<WasiyyahData>)}
            itemLabel={noun}
            empty={empty}
            render={(c, set) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Name"><TextInput value={c.name} placeholder="Full name" onChange={(e) => set({ name: e.target.value })} /></Field>
                    <Field label="Relationship"><TextInput value={c.relation ?? ''} placeholder="e.g. Brother, friend" onChange={(e) => set({ relation: e.target.value })} /></Field>
                    <Field label="Contact"><TextInput value={c.contact ?? ''} placeholder="Phone or email" onChange={(e) => set({ contact: e.target.value })} /></Field>
                </div>
            )}
        />
    );
}

export default function InstructionsTab() {
    const { data, update } = useWasiyyahStore();
    const t = data.testator;
    const setT = (patch: Partial<typeof t>) => update({ testator: { ...t, ...patch } });
    const addContact = (field: ContactKey) => update({ [field]: [...data[field], { id: newId(), name: '' }] } as Partial<WasiyyahData>);
    const hasMinors = data.relatives.some((r) => r.isMinor);

    return (
        <div className="space-y-6">
            <Section title="Your details" icon={UserRound}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full legal name"><TextInput value={t.fullName} onChange={(e) => setT({ fullName: e.target.value })} /></Field>
                    <Field label="Date of birth"><TextInput type="date" value={t.dateOfBirth ?? ''} onChange={(e) => setT({ dateOfBirth: e.target.value })} /></Field>
                    <Field label="Address"><TextInput value={t.address ?? ''} onChange={(e) => setT({ address: e.target.value })} /></Field>
                    <Field label="Country / state of residence"><TextInput value={t.jurisdiction ?? ''} placeholder="e.g. Ontario, Canada" onChange={(e) => setT({ jurisdiction: e.target.value })} /></Field>
                </div>
            </Section>

            <Section
                title="Executors"
                icon={ShieldCheck}
                description="Trustworthy people who will pay your debts and carry out this will. Name a backup too."
                action={<AddButton onClick={() => addContact('executors')}>Add executor</AddButton>}
            >
                <ContactList field="executors" noun="executor" empty="No executor named yet." />
            </Section>

            <Section
                title="Guardians for minor children"
                icon={Baby}
                description={hasMinors ? 'You have marked at least one relative as a minor.' : 'Only needed if you have children under 18.'}
                action={<AddButton onClick={() => addContact('guardians')}>Add guardian</AddButton>}
            >
                <ContactList field="guardians" noun="guardian" empty="No guardian named." />
            </Section>

            <Section title="Funeral and burial wishes" icon={Flower2}>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="Preferred burial place">
                        <TextInput value={data.funeral.burialLocation ?? ''} placeholder="e.g. Muslim section of the local cemetery"
                            onChange={(e) => update({ funeral: { ...data.funeral, burialLocation: e.target.value } })} />
                    </Field>
                    <Field label="Wishes">
                        <textarea
                            rows={4}
                            className={inputClass}
                            value={data.funeral.wishes ?? ''}
                            placeholder="e.g. Ghusl and janazah by the local masjid; bury me quickly, simply and without extravagance, following the sunnah; no wailing or practices without a basis in the sunnah."
                            onChange={(e) => update({ funeral: { ...data.funeral, wishes: e.target.value } })}
                        />
                    </Field>
                </div>
            </Section>

            <Section title="Advice to my family" icon={MessageSquareHeart} description="An optional personal message (nasiha) to the people you leave behind.">
                <textarea
                    rows={5}
                    className={inputClass}
                    value={data.personalMessage}
                    placeholder="e.g. I advise my family to fear Allah, hold fast to the prayer, keep the ties of kinship and divide this estate justly according to the Shariah."
                    onChange={(e) => update({ personalMessage: e.target.value })}
                />
            </Section>

            <Section
                title="Witnesses"
                icon={PenLine}
                description="Two adult witnesses who don't benefit from the will. Your local law may set further rules."
                action={<AddButton onClick={() => addContact('witnesses')}>Add witness</AddButton>}
            >
                <ContactList field="witnesses" noun="witness" empty="No witnesses yet." />
            </Section>
        </div>
    );
}
