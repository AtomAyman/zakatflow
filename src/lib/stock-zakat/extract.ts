// ─── Balance-sheet extraction from XBRL company facts ─────────────────────
//
// Pure functions: no network. Given a company's facts and the user's Zakat
// date, pick the most recent balance sheet that had been *filed* by that date
// and read every field from that same balance-sheet date.

import { ACCEPTED_FORMS, CONCEPTS, type ConceptStrategy, type FieldKey } from './concepts';
import type {
    BalanceSheetSnapshot,
    CompanyFacts,
    ComponentKey,
    ExtractedValue,
    Taxonomy,
    XbrlConcept,
    XbrlFact,
} from './types';

const COMPONENT_KEYS: ComponentKey[] = ['cash', 'shortTermInvestments', 'receivables', 'inventory'];

const COMPONENT_LABELS: Record<ComponentKey, string> = {
    cash: 'Cash',
    shortTermInvestments: 'Short-term investments',
    receivables: 'Receivables',
    inventory: 'Inventory',
};

export class ExtractionError extends Error {
    constructor(message: string, readonly code: 'no_taxonomy' | 'no_balance_sheet') {
        super(message);
    }
}

/** Choose the taxonomy holding the primary financial statements. */
export function detectTaxonomy(facts: CompanyFacts): Taxonomy | null {
    const hasAssets = (t: Taxonomy) => Boolean(facts.facts[t]?.Assets);
    if (hasAssets('us-gaap') && hasAssets('ifrs-full')) {
        // Prefer whichever has the more recent balance sheet.
        const latest = (t: Taxonomy) => {
            const c = facts.facts[t].Assets;
            return Object.values(c.units).flat().reduce((m, f) => (f.end > m ? f.end : m), '');
        };
        return latest('ifrs-full') > latest('us-gaap') ? 'ifrs-full' : 'us-gaap';
    }
    if (hasAssets('us-gaap')) return 'us-gaap';
    if (hasAssets('ifrs-full')) return 'ifrs-full';
    return null;
}

function isUsableInstant(f: XbrlFact, asOf: string): boolean {
    return !f.start && ACCEPTED_FORMS.has(f.form) && f.end <= asOf && f.filed <= asOf;
}

/** Latest-filed value of an instant concept at an exact date (restatements win). */
function valueAt(concept: XbrlConcept | undefined, unit: string, end: string, asOf: string): XbrlFact | null {
    const facts = concept?.units[unit];
    if (!facts) return null;
    let best: XbrlFact | null = null;
    for (const f of facts) {
        if (f.end !== end || !isUsableInstant(f, asOf)) continue;
        if (!best || f.filed > best.filed) best = f;
    }
    return best;
}

function resolveStrategies(
    gaap: Record<string, XbrlConcept>,
    strategies: ConceptStrategy[],
    unit: string,
    end: string,
    asOf: string
): { value: ExtractedValue; note?: string } | null {
    for (const s of strategies) {
        const primary = valueAt(gaap[s.primary], unit, end, asOf);
        if (!primary) continue;
        let value = primary.val;
        const concepts = [s.primary];
        for (const extra of s.extras ?? []) {
            const f = valueAt(gaap[extra], unit, end, asOf);
            if (f) {
                value += f.val;
                concepts.push(extra);
            }
        }
        return { value: { value, concepts }, note: s.note };
    }
    return null;
}

/**
 * Was any concept for this field reported, at a material size (≥ 0.5% of
 * total assets), in the two years before `end`?
 */
function reportedRecently(
    gaap: Record<string, XbrlConcept>,
    strategies: ConceptStrategy[],
    unit: string,
    end: string,
    asOf: string,
    totalAssets: number
): boolean {
    const material = Math.abs(totalAssets) * 0.005;
    const cutoff = shiftDate(end, -730);
    return strategies.some((s) =>
        [s.primary, ...(s.extras ?? [])].some((c) =>
            (gaap[c]?.units[unit] ?? []).some(
                (f) => Math.abs(f.val) >= material && isUsableInstant(f, asOf) && f.end >= cutoff && f.end < end
            )
        )
    );
}

export function shiftDate(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
    return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function pickMonetaryUnit(assets: XbrlConcept): string {
    const units = Object.keys(assets.units);
    return units.includes('USD') ? 'USD' : units[0];
}

function extractShares(
    facts: CompanyFacts,
    taxonomy: Taxonomy,
    periodEnd: string,
    accession: string,
    asOf: string
): (ExtractedValue & { approximate: boolean }) | null {
    const gaap = facts.facts[taxonomy];

    // 1. Shares outstanding on the balance-sheet date.
    const bs = resolveStrategies(gaap, CONCEPTS[taxonomy].sharesOutstanding, 'shares', periodEnd, asOf);
    if (bs && bs.value.value > 0) return { ...bs.value, approximate: false };

    // 2. Cover-page share count from the same filing (dated shortly after the period end).
    const dei = facts.facts.dei?.EntityCommonStockSharesOutstanding?.units.shares ?? [];
    const cover = dei
        .filter((f) => f.accn === accession && f.filed <= asOf)
        .sort((a, b) => (a.end < b.end ? 1 : -1))[0];
    if (cover && cover.val > 0) {
        return { value: cover.val, concepts: ['dei:EntityCommonStockSharesOutstanding'], approximate: false };
    }

    // 3. Weighted-average shares for the period ending on the balance-sheet date.
    for (const c of ['WeightedAverageNumberOfSharesOutstandingBasic', 'WeightedAverageNumberOfDilutedSharesOutstanding']) {
        const arr = gaap[c]?.units.shares ?? [];
        const match = arr
            .filter((f) => f.end === periodEnd && f.start && f.filed <= asOf && ACCEPTED_FORMS.has(f.form))
            .sort((a, b) => (a.filed < b.filed ? 1 : -1))[0];
        if (match && match.val > 0) return { value: match.val, concepts: [c], approximate: true };
    }
    return null;
}

/**
 * Extract the Zakat-relevant balance sheet in effect on `asOf` (YYYY-MM-DD).
 * Only data filed on or before `asOf` is used, so past years reproduce exactly.
 */
export function extractBalanceSheet(facts: CompanyFacts, asOf: string): BalanceSheetSnapshot {
    const taxonomy = detectTaxonomy(facts);
    if (!taxonomy) {
        throw new ExtractionError(`${facts.entityName} has no balance sheet in its XBRL filings.`, 'no_taxonomy');
    }
    const gaap = facts.facts[taxonomy];
    const unit = pickMonetaryUnit(gaap.Assets);

    // Most recent balance-sheet date with total assets filed by asOf.
    let anchor: XbrlFact | null = null;
    for (const f of gaap.Assets.units[unit]) {
        if (!isUsableInstant(f, asOf)) continue;
        if (!anchor || f.end > anchor.end || (f.end === anchor.end && f.filed > anchor.filed)) anchor = f;
    }
    if (!anchor) {
        throw new ExtractionError(`No balance sheet for ${facts.entityName} was filed on or before ${asOf}.`, 'no_balance_sheet');
    }
    const periodEnd = anchor.end;
    const warnings: string[] = [];
    const strategiesFor = (k: FieldKey) => CONCEPTS[taxonomy][k];

    const components = {} as Record<ComponentKey, ExtractedValue | null>;
    for (const key of COMPONENT_KEYS) {
        const r = resolveStrategies(gaap, strategiesFor(key), unit, periodEnd, asOf);
        components[key] = r?.value ?? null;
        if (r?.note) warnings.push(r.note);
        if (!r && reportedRecently(gaap, strategiesFor(key), unit, periodEnd, asOf, anchor.val)) {
            warnings.push(
                `${COMPONENT_LABELS[key]} was reported in earlier filings but no matching line was found for ${periodEnd}; it is counted as zero.`
            );
        }
    }

    const currentAssets = resolveStrategies(gaap, strategiesFor('currentAssets'), unit, periodEnd, asOf)?.value ?? null;
    const currentLiabilities =
        resolveStrategies(gaap, strategiesFor('currentLiabilities'), unit, periodEnd, asOf)?.value ?? null;
    const sharesOutstanding = extractShares(facts, taxonomy, periodEnd, anchor.accn, asOf);
    if (sharesOutstanding?.approximate) {
        warnings.push('Shares outstanding estimated from the weighted-average share count for the period.');
    }

    return {
        taxonomy,
        currency: unit,
        periodEnd,
        form: anchor.form,
        accession: anchor.accn,
        filed: anchor.filed,
        components,
        totalAssets: anchor.val,
        currentAssets,
        currentLiabilities,
        sharesOutstanding,
        warnings,
    };
}
