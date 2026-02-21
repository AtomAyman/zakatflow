'use client';

import { create } from 'zustand';
import {
    type Settings,
    type Asset,
    type Liability,
    type HistoryEntry,
    type PriceData,
    type DashboardSummary,
    DEFAULT_SETTINGS,
    DEFAULT_PRICES,
} from './types';
import { calculateDashboard } from './zakat-engine';
import { v4 as uuid } from 'uuid';

interface ZakatStore {
    // State
    settings: Settings;
    assets: Asset[];        // ALL assets across all years
    liabilities: Liability[]; // ALL liabilities across all years
    history: HistoryEntry[];
    prices: PriceData;
    spreadsheetId: string | null;
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;
    selectedYear: string;   // currently viewed Zakat year

    // Derived
    dashboard: DashboardSummary;

    // Actions
    setSpreadsheetId: (id: string) => void;
    setSettings: (settings: Settings) => void;
    setAssets: (assets: Asset[]) => void;
    addAsset: (asset: Asset) => void;
    removeAsset: (id: string) => void;
    setLiabilities: (liabilities: Liability[]) => void;
    addLiability: (liability: Liability) => void;
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
    prices: DEFAULT_PRICES,
    spreadsheetId: null,
    isLoading: false,
    error: null,
    isInitialized: false,
    selectedYear: currentYear,
    dashboard: defaultDashboard,

    // Simple setters
    setSpreadsheetId: (id) => set({ spreadsheetId: id }),
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
        set({ dashboard });
    },

    // Fetch all data from APIs
    fetchAllData: async () => {
        const { spreadsheetId } = get();
        if (!spreadsheetId) return;

        set({ isLoading: true, error: null });
        try {
            const sheetHeaders = { 'x-spreadsheet-id': spreadsheetId };
            const [settingsRes, assetsRes, liabilitiesRes, historyRes, pricesRes] =
                await Promise.all([
                    fetch('/api/sheets/settings', { headers: sheetHeaders }),
                    fetch('/api/sheets/assets', { headers: sheetHeaders }),
                    fetch('/api/sheets/liabilities', { headers: sheetHeaders }),
                    fetch('/api/sheets/history', { headers: sheetHeaders }),
                    fetch('/api/prices'),
                ]);

            const settings = await settingsRes.json();
            const assets = await assetsRes.json();
            const liabilities = await liabilitiesRes.json();
            const history = await historyRes.json();
            const prices = await pricesRes.json();

            set({
                settings: settings.data || DEFAULT_SETTINGS,
                assets: assets.data || [],
                liabilities: liabilities.data || [],
                history: history.data || [],
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

    // Save settings via API
    saveCurrentSettings: async () => {
        const { settings } = get();
        try {
            await fetch('/api/sheets/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-spreadsheet-id': get().spreadsheetId || '',
                },
                body: JSON.stringify(settings),
            });
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : 'Failed to save settings',
            });
        }
    },
}));
