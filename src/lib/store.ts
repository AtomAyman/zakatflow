'use client';

import { create } from 'zustand';
import {
    type Settings,
    type Asset,
    type Liability,
    type HistoryEntry,
    type DonationEntry,
    type DonationPlan,
    type InterestEntry,
    type PriceData,
    type DashboardSummary,
    DEFAULT_SETTINGS,
    DEFAULT_PRICES,
} from './types';
import { calculateDashboard, calculateAssetNetValue } from './zakat-engine';
import { interestBalance, type Allocation } from './donations';
import type { ChangeOp, RepairReport, StorageFile, SummaryPayload, UserData, YearSummary } from './storage/types';
import { v4 as uuid } from 'uuid';

/**
 * App state. Everything lives in memory only — nothing is written to
 * localStorage/IndexedDB — so closing the tab or signing out leaves no copy
 * of the user's data in the browser.
 *
 * Edits update the UI immediately and are queued; the queue is saved to the
 * user's spreadsheet in one batch shortly after the last edit. Failed saves
 * stay queued so they can be retried.
 */

export type SyncStatus = 'idle' | 'saving' | 'error' | 'reauth';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ZakatStore {
    // Data
    settings: Settings;
    assets: Asset[];        // ALL assets across all years
    liabilities: Liability[]; // ALL liabilities across all years
    history: HistoryEntry[];
    donations: DonationEntry[]; // ALL donations across all years
    donationPlans: DonationPlan[];
    interest: InterestEntry[];  // interest earned, ALL years
    prices: PriceData;
    selectedYear: string;
    dashboard: DashboardSummary;

    // Storage
    file: StorageFile | null;
    loadStatus: LoadStatus;
    loadError: string | null;
    syncStatus: SyncStatus;
    syncError: string | null;
    pendingChanges: number;
    lastSavedAt: number | null;

    // Local-only setters
    setSettings: (settings: Settings) => void;
    setSelectedYear: (year: string) => void;
    recalculate: () => void;

    // Edits (update UI immediately, then save)
    addAsset: (asset: Asset) => void;
    updateAsset: (asset: Asset) => void;
    removeAsset: (id: string) => void;
    addLiability: (liability: Liability) => void;
    updateLiability: (liability: Liability) => void;
    removeLiability: (id: string) => void;
    saveHistoryEntry: (entry: HistoryEntry) => void;
    saveDonation: (donation: Omit<DonationEntry, 'id'>) => Promise<void>;
    deleteDonation: (id: string) => Promise<void>;
    /** One payment, split across one or more recipients (one Donations row each). */
    savePayment: (payment: PaymentInput) => Promise<void>;
    /** Delete every row of a payment. */
    deletePayment: (paymentId: string) => Promise<void>;
    saveDonationPlan: (plan: DonationPlan) => Promise<void>;
    deleteDonationPlan: (id: string) => Promise<void>;
    saveInterest: (entry: InterestEntry) => Promise<void>;
    deleteInterest: (id: string) => Promise<void>;
    copyYearData: (fromYear: string, toYear: string) => void;
    saveCurrentSettings: () => Promise<void>;

    // Year helpers
    getAssetsForYear: (year: string) => Asset[];
    getLiabilitiesForYear: (year: string) => Liability[];
    getYearsWithData: () => string[];

    // Lifecycle
    /** `background` reloads without showing the full-screen loading state. */
    loadData: (opts?: { background?: boolean }) => Promise<void>;
    flush: () => Promise<void>;
    retrySync: () => Promise<void>;
    repairFile: () => Promise<RepairReport>;
    reset: () => void;
}

export interface PaymentInput {
    date: string;
    zakatYear: string;
    category: DonationEntry['category'];
    notes: string;
    planId?: string;
    allocations: Allocation[];
}

const currentYear = new Date().getFullYear().toString();

const defaultDashboard: DashboardSummary = {
    totalGrossAssets: 0,
    totalDeductions: 0,
    totalNetZakatableAssets: 0,
    totalLiabilities: 0,
    liabilityDeduction: 0,
    interestToGiveAway: 0,
    netZakatableWealth: 0,
    nisabThreshold: 0,
    isAboveNisab: false,
    zakatRate: 0.025,
    zakatDue: 0,
    assetBreakdown: [],
};

const initialState = {
    settings: DEFAULT_SETTINGS,
    assets: [] as Asset[],
    liabilities: [] as Liability[],
    history: [] as HistoryEntry[],
    donations: [] as DonationEntry[],
    donationPlans: [] as DonationPlan[],
    interest: [] as InterestEntry[],
    prices: DEFAULT_PRICES,
    selectedYear: currentYear,
    dashboard: defaultDashboard,
    file: null as StorageFile | null,
    loadStatus: 'idle' as LoadStatus,
    loadError: null as string | null,
    syncStatus: 'idle' as SyncStatus,
    syncError: null as string | null,
    pendingChanges: 0,
    lastSavedAt: null as number | null,
};

// ─── Save queue ───────────────────────────────────────────

const SAVE_DELAY_MS = 600;

/** Latest pending change per record; later edits replace earlier ones. */
const queue = new Map<string, ChangeOp>();
let summaryDirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> | null = null;

export function changeKey(op: ChangeOp): string {
    if (op.action === 'delete') return `${op.entity}:${op.key}`;
    switch (op.entity) {
        case 'settings':
            return 'settings';
        case 'history':
            return `history:${op.record.year}`;
        default:
            return `${op.entity}:${op.record.id}`;
    }
}

interface ApiResult<T> {
    ok: boolean;
    status: number;
    data?: T;
    error?: string;
    code?: string;
}

async function callApi<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data: json.data, error: json.error, code: json.code };
    } catch {
        return {
            ok: false,
            status: 0,
            error: "You're offline or the server can't be reached. Your changes are kept and will be saved when you retry.",
        };
    }
}

/** Per-year rows for the spreadsheet's Summary tab. */
export function buildSummary(
    state: Pick<ZakatStore, 'assets' | 'liabilities' | 'history' | 'donations' | 'settings' | 'prices'> &
        Partial<Pick<ZakatStore, 'interest'>>
): SummaryPayload {
    const years = new Set<string>();
    state.assets.forEach((a) => years.add(a.zakatYear));
    state.liabilities.forEach((l) => years.add(l.zakatYear));
    state.history.forEach((h) => years.add(h.year));
    state.donations.forEach((d) => d.zakatYear && years.add(d.zakatYear));

    const rows: YearSummary[] = [...years].filter(Boolean).map((year) => {
        const finalized = state.history.find((h) => h.year === year);
        if (finalized) {
            // A finalized year is a record of what was decided at the time.
            return {
                year,
                totalAssets: finalized.totalAssets,
                notZakatable: 0,
                debtsDeducted: finalized.totalLiabilities,
                netZakatable: finalized.netZakatable,
                nisab: finalized.nisabThresholdUsed,
                aboveNisab: finalized.netZakatable >= finalized.nisabThresholdUsed,
                zakatDue: finalized.zakatPaid,
            };
        }
        const d = calculateDashboard(
            state.assets.filter((a) => a.zakatYear === year),
            state.liabilities.filter((l) => l.zakatYear === year),
            state.settings,
            state.prices,
            outstandingInterest(state, year)
        );
        return {
            year,
            totalAssets: d.totalGrossAssets,
            notZakatable: d.totalDeductions,
            debtsDeducted: d.liabilityDeduction,
            netZakatable: d.netZakatableWealth,
            nisab: d.nisabThreshold,
            aboveNisab: d.isAboveNisab,
            zakatDue: d.zakatDue,
        };
    });

    return { baseCurrency: state.settings.baseCurrency, years: rows };
}

/** Interest earned through `year` and not yet given away (base currency). */
export function outstandingInterest(
    state: Pick<ZakatStore, 'donations' | 'settings' | 'prices'> & Partial<Pick<ZakatStore, 'interest'>>,
    year: string
): number {
    return interestBalance(state.interest ?? [], state.donations, state.settings.baseCurrency, state.prices.exchangeRates, year)
        .outstanding;
}

export const useZakatStore = create<ZakatStore>((set, get) => {
    const scheduleFlush = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            get().flush().catch(() => {
                /* status is already recorded in the store */
            });
        }, SAVE_DELAY_MS);
    };

    const enqueue = (...ops: ChangeOp[]) => {
        for (const op of ops) queue.set(changeKey(op), op);
        summaryDirty = true;
        set({ pendingChanges: queue.size });
        scheduleFlush();
    };

    return {
        ...initialState,

        // ── Local-only setters ──
        setSettings: (settings) => {
            set({ settings });
            get().recalculate();
        },
        setSelectedYear: (year) => {
            set({ selectedYear: year });
            get().recalculate();
        },

        // ── Edits ──
        addAsset: (asset) => {
            set((s) => ({ assets: [...s.assets, asset] }));
            get().recalculate();
            enqueue({ entity: 'assets', action: 'upsert', record: asset });
        },
        updateAsset: (asset) => {
            set((s) => ({ assets: s.assets.map((a) => (a.id === asset.id ? asset : a)) }));
            get().recalculate();
            enqueue({ entity: 'assets', action: 'upsert', record: asset });
        },
        removeAsset: (id) => {
            set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
            get().recalculate();
            enqueue({ entity: 'assets', action: 'delete', key: id });
        },
        addLiability: (liability) => {
            set((s) => ({ liabilities: [...s.liabilities, liability] }));
            get().recalculate();
            enqueue({ entity: 'liabilities', action: 'upsert', record: liability });
        },
        updateLiability: (liability) => {
            set((s) => ({ liabilities: s.liabilities.map((l) => (l.id === liability.id ? liability : l)) }));
            get().recalculate();
            enqueue({ entity: 'liabilities', action: 'upsert', record: liability });
        },
        removeLiability: (id) => {
            set((s) => ({ liabilities: s.liabilities.filter((l) => l.id !== id) }));
            get().recalculate();
            enqueue({ entity: 'liabilities', action: 'delete', key: id });
        },
        saveHistoryEntry: (entry) => {
            // One finalized record per Zakat year; finalizing again replaces it.
            set((s) => ({ history: [...s.history.filter((h) => h.year !== entry.year), entry] }));
            enqueue({ entity: 'history', action: 'upsert', record: entry });
        },
        saveDonation: async (donation) => {
            const entry: DonationEntry = { ...donation, id: uuid() };
            set((s) => ({ donations: [entry, ...s.donations] }));
            get().recalculate();
            enqueue({ entity: 'donations', action: 'upsert', record: entry });
            await get().flush();
        },
        deleteDonation: async (id) => {
            set((s) => ({ donations: s.donations.filter((d) => d.id !== id) }));
            get().recalculate();
            enqueue({ entity: 'donations', action: 'delete', key: id });
            await get().flush();
        },
        savePayment: async (payment) => {
            const paymentId = uuid();
            const entries: DonationEntry[] = payment.allocations.map((a) => ({
                id: uuid(),
                paymentId,
                planId: payment.planId,
                zakatYear: payment.zakatYear,
                date: payment.date,
                category: payment.category,
                notes: payment.notes,
                recipient: a.recipient.trim(),
                amount: Math.round(a.amount * 100) / 100,
            }));
            set((s) => ({ donations: [...entries, ...s.donations] }));
            // Interest given away changes what is Zakatable.
            get().recalculate();
            enqueue(...entries.map((record): ChangeOp => ({ entity: 'donations', action: 'upsert', record })));
            await get().flush();
        },
        deletePayment: async (paymentId) => {
            const ids = get().donations.filter((d) => (d.paymentId ?? d.id) === paymentId).map((d) => d.id);
            set((s) => ({ donations: s.donations.filter((d) => !ids.includes(d.id)) }));
            get().recalculate();
            enqueue(...ids.map((key): ChangeOp => ({ entity: 'donations', action: 'delete', key })));
            await get().flush();
        },
        saveDonationPlan: async (plan) => {
            set((s) => ({ donationPlans: [...s.donationPlans.filter((p) => p.id !== plan.id), plan] }));
            enqueue({ entity: 'donationPlans', action: 'upsert', record: plan });
            await get().flush();
        },
        deleteDonationPlan: async (id) => {
            // Payments already made stay in the ledger; they just lose the plan link in the UI.
            set((s) => ({ donationPlans: s.donationPlans.filter((p) => p.id !== id) }));
            enqueue({ entity: 'donationPlans', action: 'delete', key: id });
            await get().flush();
        },
        saveInterest: async (entry) => {
            set((s) => ({ interest: [...s.interest.filter((e) => e.id !== entry.id), entry] }));
            get().recalculate();
            enqueue({ entity: 'interest', action: 'upsert', record: entry });
            await get().flush();
        },
        deleteInterest: async (id) => {
            set((s) => ({ interest: s.interest.filter((e) => e.id !== id) }));
            get().recalculate();
            enqueue({ entity: 'interest', action: 'delete', key: id });
            await get().flush();
        },
        copyYearData: (fromYear, toYear) => {
            const { assets, liabilities } = get();
            const newAssets = assets
                .filter((a) => a.zakatYear === fromYear)
                .map((a) => ({ ...a, id: uuid(), zakatYear: toYear }));
            const newLiabilities = liabilities
                .filter((l) => l.zakatYear === fromYear)
                .map((l) => ({ ...l, id: uuid(), zakatYear: toYear }));

            set((s) => ({
                assets: [...s.assets, ...newAssets],
                liabilities: [...s.liabilities, ...newLiabilities],
            }));
            get().recalculate();
            enqueue(
                ...newAssets.map((record): ChangeOp => ({ entity: 'assets', action: 'upsert', record })),
                ...newLiabilities.map((record): ChangeOp => ({ entity: 'liabilities', action: 'upsert', record }))
            );
        },
        saveCurrentSettings: async () => {
            enqueue({ entity: 'settings', action: 'upsert', record: get().settings });
            await get().flush();
        },

        // ── Year helpers ──
        getAssetsForYear: (year) => get().assets.filter((a) => a.zakatYear === year),
        getLiabilitiesForYear: (year) => get().liabilities.filter((l) => l.zakatYear === year),
        getYearsWithData: () => {
            const { assets, liabilities } = get();
            const years = new Set<string>();
            assets.forEach((a) => years.add(a.zakatYear));
            liabilities.forEach((l) => years.add(l.zakatYear));
            return Array.from(years).sort().reverse();
        },

        // Recalculate dashboard (only for selectedYear's data)
        recalculate: () => {
            const { assets, liabilities, settings, prices, selectedYear } = get();
            const yearAssets = assets.filter((a) => a.zakatYear === selectedYear);
            const yearLiabilities = liabilities.filter((l) => l.zakatYear === selectedYear);
            const dashboard = calculateDashboard(
                yearAssets,
                yearLiabilities,
                settings,
                prices,
                outstandingInterest(get(), selectedYear)
            );

            // Stamp computed values back onto each asset for display
            const updatedAssets = assets.map((asset) => {
                if (asset.zakatYear !== selectedYear) return asset;
                const { netZakatable, deductible, computedGrossInBase } = calculateAssetNetValue(
                    asset, settings, prices.exchangeRates, prices
                );
                return {
                    ...asset,
                    netZakatableValue: netZakatable,
                    deductibleTaxPenalty: deductible,
                    // Store computed gross in base currency for display (don't overwrite grossValue)
                    _computedGross: computedGrossInBase,
                };
            });

            set({ dashboard, assets: updatedAssets });
        },

        // ── Lifecycle ──
        loadData: async (opts) => {
            if (!opts?.background) set({ loadStatus: 'loading', loadError: null });
            const [loaded, prices] = await Promise.all([
                callApi<{ file: StorageFile; data: UserData; summaryStale: boolean }>('/api/storage/load'),
                fetch('/api/prices').then((r) => r.json()).catch(() => ({})),
            ]);

            if (!loaded.ok || !loaded.data) {
                if (opts?.background) throw new Error(loaded.error || 'Could not reload your spreadsheet.');
                set({
                    loadStatus: 'error',
                    loadError: loaded.error || 'Could not open your spreadsheet.',
                    syncStatus: loaded.status === 401 ? 'reauth' : get().syncStatus,
                });
                return;
            }

            const { file, data, summaryStale } = loaded.data;
            set({
                file,
                settings: data.settings,
                assets: data.assets,
                liabilities: data.liabilities,
                history: data.history,
                donations: data.donations,
                donationPlans: data.donationPlans ?? [],
                interest: data.interest ?? [],
                prices: prices?.data || DEFAULT_PRICES,
                loadStatus: 'ready',
            });
            get().recalculate();

            if (summaryStale) {
                summaryDirty = true;
                scheduleFlush();
            }
        },

        flush: async () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            // One save at a time; anything queued meanwhile goes in the next batch.
            while (inflight) await inflight.catch(() => {});

            const { file } = get();
            if (!file || (queue.size === 0 && !summaryDirty)) return;

            const batch = [...queue.entries()];
            queue.clear();
            const sendSummary = summaryDirty;
            summaryDirty = false;
            set({ syncStatus: 'saving', pendingChanges: batch.length });

            const run = (async () => {
                const result = await callApi('/api/storage/changes', {
                    fileId: file.id,
                    ops: batch.map(([, op]) => op),
                    summary: sendSummary ? buildSummary(get()) : undefined,
                });

                if (!result.ok) {
                    // Put the batch back unless a newer edit to the same record arrived.
                    for (const [key, op] of batch) if (!queue.has(key)) queue.set(key, op);
                    summaryDirty = summaryDirty || sendSummary;
                    set({
                        syncStatus: result.status === 401 ? 'reauth' : 'error',
                        syncError: result.error || 'Could not save your changes.',
                        pendingChanges: queue.size,
                    });
                    throw new Error(result.error || 'Save failed');
                }

                set({
                    syncStatus: queue.size > 0 ? 'saving' : 'idle',
                    syncError: null,
                    pendingChanges: queue.size,
                    lastSavedAt: Date.now(),
                });
            })();

            inflight = run;
            try {
                await run;
            } finally {
                inflight = null;
            }
            if (queue.size > 0) scheduleFlush();
        },

        retrySync: async () => {
            summaryDirty = summaryDirty || queue.size > 0;
            await get().flush();
        },

        repairFile: async () => {
            await get().flush();
            const { file } = get();
            if (!file) throw new Error('No spreadsheet connected');
            const result = await callApi<RepairReport>('/api/storage/repair', { fileId: file.id });
            if (!result.ok || !result.data) {
                if (result.status === 401) set({ syncStatus: 'reauth', syncError: result.error ?? null });
                throw new Error(result.error || 'Repair failed');
            }
            await get().loadData({ background: true });
            summaryDirty = true;
            await get().flush();
            return result.data;
        },

        reset: () => {
            if (timer) clearTimeout(timer);
            timer = null;
            queue.clear();
            summaryDirty = false;
            set({ ...initialState });
        },
    };
});
