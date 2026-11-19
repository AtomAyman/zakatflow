'use client';

import { signIn } from 'next-auth/react';
import { AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import { useZakatStore } from '@/lib/store';

/** Shown at the top of every dashboard page when saving needs attention. */
export default function SyncBanner() {
    const syncStatus = useZakatStore((s) => s.syncStatus);
    const syncError = useZakatStore((s) => s.syncError);
    const pendingChanges = useZakatStore((s) => s.pendingChanges);
    const retrySync = useZakatStore((s) => s.retrySync);

    if (syncStatus !== 'error' && syncStatus !== 'reauth') return null;

    const unsaved =
        pendingChanges > 0
            ? ` ${pendingChanges} change${pendingChanges === 1 ? ' is' : 's are'} not saved yet.`
            : '';

    if (syncStatus === 'reauth') {
        return (
            <div role="alert" className="flex flex-wrap items-center gap-3 px-6 lg:px-8 py-3 bg-amber-500/10 border-b border-amber-500/20 text-sm">
                <KeyRound size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="flex-1 min-w-[200px] text-foreground">
                    {syncError || 'Your Google connection has expired.'}
                    {unsaved && <span className="text-muted-foreground">{unsaved} Reconnecting reloads the page, so re-enter them afterwards.</span>}
                </p>
                <button
                    onClick={() => signIn('google', { callbackUrl: window.location.pathname })}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                >
                    Reconnect Google
                </button>
            </div>
        );
    }

    return (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-6 lg:px-8 py-3 bg-destructive/10 border-b border-destructive/20 text-sm">
            <AlertTriangle size={16} className="text-destructive shrink-0" />
            <p className="flex-1 min-w-[200px] text-foreground">
                {syncError || 'Could not save your changes.'}
                <span className="text-muted-foreground">{unsaved}</span>
            </p>
            <button
                onClick={() => retrySync().catch(() => {})}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
            >
                <RefreshCw size={14} /> Retry
            </button>
        </div>
    );
}
