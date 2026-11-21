// The one piece of Zakat data a companion module reads: a plain, versioned
// snapshot of what the user owns and owes, in their base currency.
//
// Wasiyyah (V2) uses it to fill the estate side of a will. ZakatFlow never
// reads the will back, and nothing here changes how Zakat is calculated.
// Change the shape only by bumping WEALTH_SNAPSHOT_VERSION. See docs/modules.md.

import type { Asset, AssetType, Liability, LiabilityType, PriceData, Settings } from '../types';
import { calculateAssetNetValue } from '../zakat-engine';
import { convertToBaseCurrency } from '../price-service';

export const WEALTH_SNAPSHOT_VERSION = 1 as const;

export interface WealthSnapshotAsset {
    id: string;
    type: AssetType;
    name: string;
    /** Full market value in the base currency (not the Zakatable part). */
    valueInBase: number;
}

export interface WealthSnapshotLiability {
    id: string;
    type: LiabilityType;
    name: string;
    /** Whole outstanding amount in the base currency. */
    amountInBase: number;
}

export interface WealthSnapshot {
    version: typeof WEALTH_SNAPSHOT_VERSION;
    baseCurrency: string;
    madhab: Settings['madhab'];
    /** The Zakat year the figures come from, or null when there is no data. */
    zakatYear: string | null;
    assets: WealthSnapshotAsset[];
    liabilities: WealthSnapshotLiability[];
    totals: { assets: number; liabilities: number };
}

/**
 * Builds the snapshot from the latest Zakat year (or the one given).
 * `years` is the store's getYearsWithData(), newest first.
 */
export function buildWealthSnapshot(input: {
    assets: Asset[];
    liabilities: Liability[];
    settings: Settings;
    prices: PriceData;
    years: string[];
    zakatYear?: string;
}): WealthSnapshot {
    const { assets, liabilities, settings, prices, years } = input;
    const base = settings.baseCurrency || 'USD';
    const zakatYear = input.zakatYear ?? years[0] ?? null;

    const snapAssets: WealthSnapshotAsset[] = zakatYear
        ? assets
            .filter((a) => a.zakatYear === zakatYear)
            .map((a) => ({
                id: a.id,
                type: a.type,
                name: a.name,
                valueInBase: calculateAssetNetValue(a, settings, prices.exchangeRates, prices).computedGrossInBase,
            }))
        : [];

    const snapLiabilities: WealthSnapshotLiability[] = zakatYear
        ? liabilities
            .filter((l) => l.zakatYear === zakatYear)
            .map((l) => ({
                id: l.id,
                type: l.type,
                name: l.name,
                amountInBase: convertToBaseCurrency(l.totalAmount || 0, l.currency || base, base, prices.exchangeRates),
            }))
        : [];

    const sum = (xs: number[]) => xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);

    return {
        version: WEALTH_SNAPSHOT_VERSION,
        baseCurrency: base,
        madhab: settings.madhab,
        zakatYear,
        assets: snapAssets,
        liabilities: snapLiabilities,
        totals: {
            assets: sum(snapAssets.map((a) => a.valueInBase)),
            liabilities: sum(snapLiabilities.map((l) => l.amountInBase)),
        },
    };
}
