// Joins the Zakat data, the will data and the faraid engine into one view model.

import type { Asset, Liability, PriceData, Settings } from './types';
import { calculateAssetNetValue } from './zakat-engine';
import { convertToBaseCurrency } from './price-service';
import {
    calculateFaraid,
    calculateWaterfall,
    toNumber,
    type EstateWaterfall,
    type FaraidResult,
    type HeirShare,
} from './faraid-engine';
import {
    DEBTS_TO_ALLAH,
    HEIR_META,
    type HeirCounts,
    type HeirKey,
    type Relative,
    type WasiyyahData,
} from './wasiyyah-types';

export interface RelativeAllocation {
    relative: Relative;
    share: HeirShare | undefined;
    fraction: number;   // of the distributable inheritance
    amount: number;     // in base currency
}

export interface ChecklistItem {
    label: string;
    done: boolean;
}

export interface WasiyyahSummary {
    baseCurrency: string;
    zakatYear: string | null;
    zakatAssetsTotal: number;
    estateItemsTotal: number;
    liabilitiesTotal: number;
    debtsEntered: number;
    waterfall: EstateWaterfall;
    faraid: FaraidResult;
    heirCounts: HeirCounts;
    allocations: RelativeAllocation[];
    bequestAmounts: { id: string; requested: number; allowed: number }[];
    bequestsToHeirs: Relative[];
    checklist: ChecklistItem[];
}

export function computeWasiyyahSummary(input: {
    data: WasiyyahData;
    assets: Asset[];
    liabilities: Liability[];
    years: string[];
    settings: Settings;
    prices: PriceData;
}): WasiyyahSummary {
    const { data, assets, liabilities, years, settings, prices } = input;
    const base = settings.baseCurrency || 'USD';
    const fx = (amount: number, currency: string) =>
        convertToBaseCurrency(amount || 0, currency || base, base, prices.exchangeRates);

    // Latest Zakat year with data = best snapshot of current wealth.
    const zakatYear = years[0] ?? null;
    const zakatAssetsTotal = data.includeZakatAssets && zakatYear
        ? assets
            .filter((a) => a.zakatYear === zakatYear)
            .reduce((s, a) => s + calculateAssetNetValue(a, settings, prices.exchangeRates, prices).computedGrossInBase, 0)
        : 0;
    const liabilitiesTotal = data.includeLiabilities && zakatYear
        ? liabilities
            .filter((l) => l.zakatYear === zakatYear)
            .reduce((s, l) => s + fx(l.totalAmount, l.currency), 0)
        : 0;

    const estateItemsTotal = data.estateItems.reduce((s, i) => s + fx(i.value, i.currency), 0);
    const debtsToAllah = data.debts
        .filter((d) => DEBTS_TO_ALLAH.includes(d.kind))
        .reduce((s, d) => s + fx(d.amount, d.currency), 0);
    const debtsEntered = data.debts
        .filter((d) => !DEBTS_TO_ALLAH.includes(d.kind))
        .reduce((s, d) => s + fx(d.amount, d.currency), 0);

    const bequestsFixed = data.bequests
        .filter((b) => b.amountType === 'fixed')
        .reduce((s, b) => s + fx(b.value, b.currency), 0);
    const bequestsPercent = data.bequests
        .filter((b) => b.amountType === 'percent')
        .reduce((s, b) => s + (b.value || 0), 0);

    const waterfall = calculateWaterfall({
        madhab: settings.madhab,
        grossEstate: zakatAssetsTotal + estateItemsTotal,
        funeral: fx(data.funeral.estimatedCost, data.funeral.currency),
        debtsToPeople: liabilitiesTotal + debtsEntered,
        debtsToAllah,
        bequestsFixed,
        bequestsPercent,
    });

    // Bequests are scaled down proportionally when they exceed the third.
    const scale = waterfall.bequestsRequested > 0 ? waterfall.bequestsAllowed / waterfall.bequestsRequested : 1;
    const bequestAmounts = data.bequests.map((b) => {
        const requested = b.amountType === 'fixed' ? fx(b.value, b.currency) : (waterfall.netEstate * (b.value || 0)) / 100;
        return { id: b.id, requested, allowed: requested * scale };
    });

    const heirCounts: HeirCounts = {};
    for (const r of data.relatives) heirCounts[r.relation] = (heirCounts[r.relation] ?? 0) + 1;

    const faraid = calculateFaraid({
        deceasedGender: data.testator.gender,
        madhab: settings.madhab,
        heirs: heirCounts,
    });
    const shareByKey = new Map<HeirKey, HeirShare>(faraid.shares.map((s) => [s.key, s]));

    // Respect the max count per relation (e.g. only the first 4 wives inherit).
    const seen: Partial<Record<HeirKey, number>> = {};
    const allocations: RelativeAllocation[] = data.relatives.map((relative) => {
        const share = shareByKey.get(relative.relation);
        const idx = (seen[relative.relation] = (seen[relative.relation] ?? 0) + 1);
        const meta = HEIR_META[relative.relation];
        const eligible = share && idx <= share.count && (!meta.onlyIf || meta.onlyIf === data.testator.gender);
        const fraction = eligible ? toNumber(share.perPerson) : 0;
        return { relative, share: eligible ? share : undefined, fraction, amount: fraction * waterfall.inheritance };
    });

    // A bequest to someone who already inherits needs the other heirs' consent.
    const heirNames = new Set(
        allocations.filter((a) => a.fraction > 0).map((a) => a.relative.name.trim().toLowerCase()).filter(Boolean)
    );
    const bequestsToHeirs = data.bequests
        .filter((b) => heirNames.has(b.beneficiary.trim().toLowerCase()))
        .map((b) => allocations.find((a) => a.relative.name.trim().toLowerCase() === b.beneficiary.trim().toLowerCase())!.relative);

    const hasMinors = data.relatives.some((r) => r.isMinor);
    const checklist: ChecklistItem[] = [
        { label: 'Your details', done: !!data.testator.fullName.trim() },
        { label: 'Family members', done: data.relatives.length > 0 },
        { label: 'Estate reviewed', done: zakatAssetsTotal + estateItemsTotal > 0 },
        { label: 'Funeral wishes', done: data.funeral.estimatedCost > 0 || !!data.funeral.wishes?.trim() },
        { label: 'Executor named', done: data.executors.length > 0 },
        ...(hasMinors ? [{ label: 'Guardian for minors', done: data.guardians.length > 0 }] : []),
        { label: 'Two witnesses', done: data.witnesses.length >= 2 },
    ];

    return {
        baseCurrency: base,
        zakatYear,
        zakatAssetsTotal,
        estateItemsTotal,
        liabilitiesTotal,
        debtsEntered,
        waterfall,
        faraid,
        heirCounts,
        allocations,
        bequestAmounts,
        bequestsToHeirs,
        checklist,
    };
}
