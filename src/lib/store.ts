'use client';

import { create } from 'zustand';
import {
    type Settings,
    type Asset,
    type Liability,
    type HistoryEntry,
    type DonationEntry,
    type PriceData,
    type DashboardSummary,
    DEFAULT_SETTINGS,
    DEFAULT_PRICES,
} from './types';
import { calculateDashboard, calculateAssetNetValue } from './zakat-engine';
import { v4 as uuid } from 'uuid';

interface ZakatStore {
    // State
    settings: Settings;
    assets: Asset[];        // ALL assets across all years
    liabilities: Liability[]; // ALL liabilities across all years
    history: HistoryEntry[];
    donations: DonationEntry[]; // ALL donations across all years
    prices: PriceData;
    spreadsheetId: string | null;
    backupSpreadsheetId: string | null;
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;
    selectedYear: string;   // currently viewed Zakat year

    // Derived
    dashboard: DashboardSummary;

    // Actions
    setSpreadsheetId: (id: string) => void;
    setBackupSpreadsheetId: (id: string) => void;
    setSettings: (settings: Settings) => void;
    setAssets: (assets: Asset[]) => void;
    addAsset: (asset: Asset) => void;
    updateAsset: (asset: Asset) => void;
    removeAsset: (id: string) => void;
    setLiabilities: (liabilities: Liability[]) => void;
    addLiability: (liability: Liability) => void;
    updateLiability: (liability: Liability) => void;
    removeLiability: (id: string) => void;
    setHistory: (history: HistoryEntry[]) => void;
    setPrices: (prices: PriceData) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setInitialized: (init: boolean) => void;
    setSelectedYear: (year: string) => void;
    recalculate: () => void;

    // Year helpers
    getAssetsForYear: (year: string) => Asset[];
    getLiabilitiesForYear: (year: string) => Liability[];
    getYearsWithData: () => string[];
    copyYearData: (fromYear: string, toYear: string) => void;

    // Async actions
    fetchAllData: () => Promise<void>;
    saveCurrentSettings: () => Promise<void>;
    saveDonation: (donation: Omit<DonationEntry, 'id'>) => Promise<void>;
    deleteDonation: (id: string) => Promise<void>;
}

function buildSheetHeaders(
    spreadsheetId: string | null,
    backupSpreadsheetId: string | null,
    json = false
): Record<string, string> {
    const headers: Record<string, string> = { 'x-spreadsheet-id': spreadsheetId || '' };
    if (backupSpreadsheetId) headers['x-backup-spreadsheet-id'] = backupSpreadsheetId;
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
}

const currentYear = new Date().getFullYear().toString();

const defaultDashboard: DashboardSummary = {
    totalGrossAssets: 0,
    totalDeductions: 0,
    totalNetZakatableAssets: 0,
    totalLiabilities: 0,
    liabilityDeduction: 0,
    netZakatableWealth: 0,
    nisabThreshold: 0,
    isAboveNisab: false,
    zakatRate: 0.025,
    zakatDue: 0,
    assetBreakdown: [],
};

export const useZakatStore = create<ZakatStore>((set, get) => ({
    // Initial state
    settings: DEFAULT_SETTINGS,
    assets: [],
    liabilities: [],
    history: [],
    donations: [],
    prices: DEFAULT_PRICES,
    spreadsheetId: null,
    backupSpreadsheetId: null,
    isLoading: false,
    error: null,
    isInitialized: false,
    selectedYear: currentYear,
    dashboard: defaultDashboard,

    // Simple setters
    setSpreadsheetId: (id) => set({ spreadsheetId: id }),
    setBackupSpreadsheetId: (id) => set({ backupSpreadsheetId: id }),
    setSettings: (settings) => {
        set({ settings });
        get().recalculate();
    },
    setAssets: (assets) => {
        set({ assets });
        get().recalculate();
    },
    addAsset: (asset) => {
        set((state) => ({ assets: [...state.assets, asset] }));
        get().recalculate();
    },
    updateAsset: (asset) => {
        set((state) => ({
            assets: state.assets.map((a) => (a.id === asset.id ? asset : a)),
        }));
        get().recalculate();
    },
    removeAsset: (id) => {
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
        get().recalculate();
    },
    setLiabilities: (liabilities) => {
        set({ liabilities });
        get().recalculate();
    },
    addLiability: (liability) => {
        set((state) => ({ liabilities: [...state.liabilities, liability] }));
        get().recalculate();
    },
    updateLiability: (liability) => {
        set((state) => ({
            liabilities: state.liabilities.map((l) => (l.id === liability.id ? liability : l)),
        }));
        get().recalculate();
    },
    removeLiability: (id) => {
        set((state) => ({
            liabilities: state.liabilities.filter((l) => l.id !== id),
        }));
        get().recalculate();
    },
    setHistory: (history) => set({ history }),
    setPrices: (prices) => {
        set({ prices });
        get().recalculate();
    },
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setInitialized: (isInitialized) => set({ isInitialized }),
    setSelectedYear: (year) => {
        set({ selectedYear: year });
        get().recalculate();
    },

    // Year helpers
    getAssetsForYear: (year) => get().assets.filter((a) => a.zakatYear === year),
    getLiabilitiesForYear: (year) =>
        get().liabilities.filter((l) => l.zakatYear === year),
    getYearsWithData: () => {
        const { assets, liabilities } = get();
        const years = new Set<string>();
        assets.forEach((a) => years.add(a.zakatYear));
        liabilities.forEach((l) => years.add(l.zakatYear));
        return Array.from(years).sort().reverse();
    },
    copyYearData: (fromYear, toYear) => {
        const { assets, liabilities } = get();
        const fromAssets = assets.filter((a) => a.zakatYear === fromYear);
        const fromLiabilities = liabilities.filter(
            (l) => l.zakatYear === fromYear
        );

        const newAssets = fromAssets.map((a) => ({
            ...a,
            id: uuid(),
            zakatYear: toYear,
        }));
        const newLiabilities = fromLiabilities.map((l) => ({
            ...l,
            id: uuid(),
            zakatYear: toYear,
        }));

        set((state) => ({
            assets: [...state.assets, ...newAssets],
            liabilities: [...state.liabilities, ...newLiabilities],
        }));
        get().recalculate();
    },

    // Recalculate dashboard (only for selectedYear's data)
    recalculate: () => {
        const { assets, liabilities, settings, prices, selectedYear } = get();
        const yearAssets = assets.filter((a) => a.zakatYear === selectedYear);
        const yearLiabilities = liabilities.filter(
            (l) => l.zakatYear === selectedYear
        );
        const dashboard = calculateDashboard(
            yearAssets,
            yearLiabilities,
            settings,
            prices
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

    // Fetch all data from APIs
    fetchAllData: async () => {
        const { spreadsheetId, backupSpreadsheetId } = get();
        if (!spreadsheetId) return;

        set({ isLoading: true, error: null });
        try {
            const sheetHeaders = buildSheetHeaders(spreadsheetId, backupSpreadsheetId);
            const [settingsRes, assetsRes, liabilitiesRes, historyRes, donationsRes, pricesRes] =
                await Promise.all([
                    fetch('/api/sheets/settings', { headers: sheetHeaders }),
                    fetch('/api/sheets/assets', { headers: sheetHeaders }),
                    fetch('/api/sheets/liabilities', { headers: sheetHeaders }),
                    fetch('/api/sheets/history', { headers: sheetHeaders }),
                    fetch('/api/sheets/donations', { headers: sheetHeaders }),
                    fetch('/api/prices'),
                ]);

            const settings = await settingsRes.json();
            const assets = await assetsRes.json();
            const liabilities = await liabilitiesRes.json();
            const history = await historyRes.json();
            const donations = await donationsRes.json();
            const prices = await pricesRes.json();

            set({
                settings: settings.data || DEFAULT_SETTINGS,
                assets: assets.data || [],
                liabilities: liabilities.data || [],
                history: history.data || [],
                donations: donations.data || [],
                prices: prices.data || DEFAULT_PRICES,
                isLoading: false,
                isInitialized: true,
            });

            get().recalculate();
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : 'Failed to fetch data',
                isLoading: false,
            });
        }
    },

    // Save settings via API. Throws on failure so the UI doesn't report a
    // save that didn't happen.
    saveCurrentSettings: async () => {
        const { settings, spreadsheetId, backupSpreadsheetId } = get();
        const res = await fetch('/api/sheets/settings', {
            method: 'POST',
            headers: buildSheetHeaders(spreadsheetId, backupSpreadsheetId, true),
            body: JSON.stringify(settings),
        });
        if (!res.ok) {
            const message = 'Failed to save settings';
            set({ error: message });
            throw new Error(message);
        }
    },

    saveDonation: async (donation) => {
        const { spreadsheetId, backupSpreadsheetId } = get();
        const res = await fetch('/api/sheets/donations', {
            method: 'POST',
            headers: buildSheetHeaders(spreadsheetId, backupSpreadsheetId, true),
            body: JSON.stringify(donation),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.data) {
            throw new Error(body.error || 'Failed to save donation');
        }
        set((state) => ({ donations: [body.data as DonationEntry, ...state.donations] }));
    },

    deleteDonation: async (id) => {
        const { spreadsheetId, backupSpreadsheetId, donations } = get();
        // Optimistic removal, restored if the sheet update fails.
        set({ donations: donations.filter((d) => d.id !== id) });
        const res = await fetch('/api/sheets/donations', {
            method: 'DELETE',
            headers: buildSheetHeaders(spreadsheetId, backupSpreadsheetId, true),
            body: JSON.stringify({ id }),
        });
        if (!res.ok) {
            set({ donations });
            throw new Error('Failed to delete donation');
        }
    },
}));
