'use client';

import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Loader2 } from 'lucide-react';
import { useZakatStore } from '@/lib/store';

/** Compact "where is my data and is it saved?" indicator. */
export default function SyncStatus() {
    const file = useZakatStore((s) => s.file);
    const syncStatus = useZakatStore((s) => s.syncStatus);
    const pendingChanges = useZakatStore((s) => s.pendingChanges);

    if (!file) return null;

    const saving = syncStatus === 'saving' || (syncStatus === 'idle' && pendingChanges > 0);

    let icon = <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />;
    let label = `Saved to ${file.providerName}`;
    if (saving) {
        icon = <Loader2 size={14} className="animate-spin text-muted-foreground" />;
        label = 'Saving…';
    } else if (syncStatus === 'error') {
        icon = <AlertTriangle size={14} className="text-destructive" />;
        label = 'Not saved — see above';
    } else if (syncStatus === 'reauth') {
        icon = <KeyRound size={14} className="text-amber-600 dark:text-amber-400" />;
        label = 'Reconnect needed';
    }

    return (
        <div className="mx-4 mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground" aria-live="polite">
            <span className="flex items-center gap-2 min-w-0">
                {icon}
                <span className="truncate">{label}</span>
            </span>
            <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-foreground shrink-0"
                title={`Open your ${file.providerName} file`}
            >
                Open <ExternalLink size={12} />
            </a>
        </div>
    );
}
