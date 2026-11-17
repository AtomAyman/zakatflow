'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScrollText, LayoutGrid, Users, Landmark, Gift, ClipboardList, FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import { useWasiyyahSummary } from '@/components/wasiyyah/useWasiyyahSummary';
import OverviewTab from '@/components/wasiyyah/OverviewTab';
import FamilyTab from '@/components/wasiyyah/FamilyTab';
import EstateTab from '@/components/wasiyyah/EstateTab';
import BequestsTab from '@/components/wasiyyah/BequestsTab';
import InstructionsTab from '@/components/wasiyyah/InstructionsTab';
import type { SaveStatus } from '@/lib/wasiyyah-store';

const TABS = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'family', label: 'Family & Heirs', icon: Users },
    { key: 'estate', label: 'Estate & Debts', icon: Landmark },
    { key: 'bequests', label: 'Bequests', icon: Gift },
    { key: 'instructions', label: 'Instructions', icon: ClipboardList },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function SaveIndicator({ status, error }: { status: SaveStatus; error: string | null }) {
    if (status === 'saving') return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" />Saving…</span>;
    if (status === 'saved') return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Check size={13} className="text-emerald-600" />Saved to your Google Sheet</span>;
    if (status === 'error') return <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"><AlertCircle size={13} />{error || 'Not saved'}</span>;
    return null;
}

export default function WasiyyahPage() {
    const { summary, isReady, isLoading, saveStatus, error } = useWasiyyahSummary();
    const [tab, setTab] = useState<TabKey>('overview');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <ScrollText size={24} className="text-emerald-500" />
                        Wasiyyah
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground">
                        Plan your Islamic will: debts, bequests and each heir&apos;s share.
                    </p>
                </div>
                <div className="flex items-center gap-4 sm:justify-end">
                    <SaveIndicator status={saveStatus} error={error} />
                    <Link
                        href="/dashboard/wasiyyah/document"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <FileText size={16} />
                        View draft will
                    </Link>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar-sm" role="tablist">
                {TABS.map((t) => {
                    const active = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(t.key)}
                            className={`flex whitespace-nowrap items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all border ${active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                                : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary/50 hover:text-foreground'}`}
                        >
                            <t.icon size={16} className={active ? 'text-emerald-600 dark:text-emerald-500' : 'opacity-70'} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {!isReady && isLoading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" /> Loading your will…
                </div>
            ) : !isReady && error ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">{error}</div>
            ) : (
                <>
                    {tab === 'overview' && <OverviewTab summary={summary} onNavigate={(k) => setTab(k as TabKey)} />}
                    {tab === 'family' && <FamilyTab summary={summary} />}
                    {tab === 'estate' && <EstateTab summary={summary} />}
                    {tab === 'bequests' && <BequestsTab summary={summary} />}
                    {tab === 'instructions' && <InstructionsTab />}
                </>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                This is a planning tool, not legal or religious advice. Shares follow the mainstream position of your chosen madhab and should be
                confirmed by a qualified scholar. To be enforceable, your wishes usually also need a will that is valid under your local law,
                signed and witnessed as that law requires.
            </p>
        </div>
    );
}
