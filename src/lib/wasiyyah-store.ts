'use client';

import { create } from 'zustand';
import { useZakatStore } from './store';
import { DEFAULT_WASIYYAH, type WasiyyahData } from './wasiyyah-types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface WasiyyahStore {
    data: WasiyyahData;
    loadedFor: string | null; // spreadsheet id the data was loaded from
    isLoading: boolean;
    saveStatus: SaveStatus;
    error: string | null;
    load: () => Promise<void>;
    update: (patch: Partial<WasiyyahData> | ((d: WasiyyahData) => Partial<WasiyyahData>)) => void;
}

const SAVE_DELAY_MS = 1200;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function sheetHeaders(): Record<string, string> | null {
    const { spreadsheetId, backupSpreadsheetId } = useZakatStore.getState();
    if (!spreadsheetId) return null;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-spreadsheet-id': spreadsheetId,
    };
    if (backupSpreadsheetId) headers['x-backup-spreadsheet-id'] = backupSpreadsheetId;
    return headers;
}

export const useWasiyyahStore = create<WasiyyahStore>((set, get) => ({
    data: DEFAULT_WASIYYAH,
    loadedFor: null,
    isLoading: false,
    saveStatus: 'idle',
    error: null,

    load: async () => {
        const headers = sheetHeaders();
        if (!headers || get().isLoading || get().loadedFor === headers['x-spreadsheet-id']) return;
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/sheets/wasiyyah', { headers });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to load will');
            const { baseCurrency } = useZakatStore.getState().settings;
            const data: WasiyyahData = { ...structuredClone(DEFAULT_WASIYYAH), ...json.data };
            if (!data.updatedAt) data.funeral = { ...data.funeral, currency: baseCurrency };
            set({ data, loadedFor: headers['x-spreadsheet-id'], isLoading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to load will', isLoading: false });
        }
    },

    update: (patch) => {
        const current = get().data;
        const changes = typeof patch === 'function' ? patch(current) : patch;
        set({ data: { ...current, ...changes, updatedAt: new Date().toISOString() }, saveStatus: 'saving' });

        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            const headers = sheetHeaders();
            if (!headers) {
                set({ saveStatus: 'error', error: 'No spreadsheet connected' });
                return;
            }
            try {
                const res = await fetch('/api/sheets/wasiyyah', {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(get().data),
                });
                if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
                set({ saveStatus: 'saved', error: null });
            } catch (err) {
                set({ saveStatus: 'error', error: err instanceof Error ? err.message : 'Save failed' });
            }
        }, SAVE_DELAY_MS);
    },
}));
