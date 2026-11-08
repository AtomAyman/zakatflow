// ─── Zakat calculation from an extracted balance sheet ────────────────────
//
// Pure functions: no network. Produces both scholar methods side by side so
// the UI can show whichever the user's scholar has approved.

import { FOREIGN_FORMS } from './concepts';
import { daysBetween } from './extract';
import {
    PROXY_ZAKATABLE_PERCENT,
    type BalanceSheetSnapshot,
    type Confidence,
    type MethodResults,
    type SectorKind,
    type StockZakatOptions,
    type StockZakatProfile,
} from './types';

/** SIC 6000–6411: banks, credit, brokers, insurers. Balance sheets are unclassified. */
export function classifySector(sic: string | null | undefined): SectorKind {
    const n = Number(sic);
    if (!Number.isFinite(n) || !sic) return 'standard';
    if (n === 6798) return 'reit';
    if (n >= 6000 && n <= 6411) return 'financial';
    return 'standard';
}

const rank: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };
const lower = (a: Confidence, b: Confidence): Confidence => (rank[a] <= rank[b] ? a : b);

export interface CompanyMeta {
    ticker: string;
    cik: number;
    companyName: string;
    sic: string | null;
    sicDescription: string | null;
}

export function filingIndexUrl(cik: number, accession: string): string {
    return `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/`;
}

export function fallbackProfile(
    meta: CompanyMeta,
    asOf: string,
    options: StockZakatOptions,
    reason: string,
    sector: SectorKind = classifySector(meta.sic)
): StockZakatProfile {
    return {
        ...meta,
        sector,
        asOf,
        status: 'fallback',
        fallback: { reason, proxyPercent: PROXY_ZAKATABLE_PERCENT },
        options,
        confidence: 'low',
        warnings: [reason],
    };
}

export function computeStockZakat(
    meta: CompanyMeta,
    snapshot: BalanceSheetSnapshot,
    asOf: string,
    options: StockZakatOptions,
    price?: number
): StockZakatProfile {
    const sector = classifySector(meta.sic);
    const warnings = [...snapshot.warnings];
    let confidence: Confidence = 'high';

    // Banks and insurers without a current/non-current split need a separate
    // scholar ruling (most of a bank's assets are loans, i.e. receivables).
    if (sector === 'financial' && !snapshot.currentAssets) {
        return fallbackProfile(
            meta,
            asOf,
            options,
            `${meta.companyName} is a bank or insurer (SIC ${meta.sic}). Its balance sheet is not split into current and non-current assets, and the Zakat treatment of financial institutions needs a scholar ruling. Using the ${PROXY_ZAKATABLE_PERCENT}% proxy.`,
            sector
        );
    }
    if (sector === 'financial') {
        warnings.push('Financial-sector company: figures are computed from its classified balance sheet, but have a scholar confirm the treatment.');
        confidence = lower(confidence, 'medium');
    }
    if (sector === 'reit') {
        warnings.push('REIT: rental property is not Zakatable, so the Zakatable share comes mainly from cash and receivables.');
        confidence = lower(confidence, 'medium');
    }

    const c = snapshot.components;
    const v = (x: { value: number } | null) => x?.value ?? 0;
    const classifiedTotal = v(c.cash) + v(c.shortTermInvestments) + v(c.receivables) + v(c.inventory);

    let zakatableTotal =
        v(c.cash) +
        v(c.inventory) +
        (options.includeShortTermInvestments ? v(c.shortTermInvestments) : 0) +
        (options.includeReceivables ? v(c.receivables) : 0);
    if (options.deductCurrentLiabilities) {
        if (snapshot.currentLiabilities) {
            zakatableTotal -= snapshot.currentLiabilities.value;
        } else {
            warnings.push('Current liabilities are not reported, so none were deducted.');
            confidence = lower(confidence, 'medium');
        }
    }
    zakatableTotal = Math.max(0, zakatableTotal);

    // ── Cross-checks ──
    if (!c.cash) {
        warnings.push('No cash figure was found on the balance sheet.');
        confidence = 'low';
    }

    let unclassifiedCurrentAssets: number | null = null;
    if (snapshot.currentAssets) {
        const ca = snapshot.currentAssets.value;
        unclassifiedCurrentAssets = ca - classifiedTotal;
        if (unclassifiedCurrentAssets < -0.02 * ca) {
            warnings.push(
                'The Zakatable lines add up to more than total current assets, so a line may be double-counted. Check the filing.'
            );
            confidence = 'low';
        } else if (ca > 0 && unclassifiedCurrentAssets / ca > 0.4) {
            warnings.push(
                `${Math.round((unclassifiedCurrentAssets / ca) * 100)}% of current assets are not classified as cash, investments, receivables or inventory, and are excluded. Check the filing for Zakatable items among them.`
            );
            confidence = lower(confidence, 'medium');
        }
    } else if (sector === 'standard') {
        warnings.push('Current assets are not reported, so the figures could not be cross-checked.');
        confidence = lower(confidence, 'medium');
    }

    // ── Staleness ──
    const age = daysBetween(snapshot.periodEnd, asOf);
    if (age > 400) {
        warnings.push(`The latest balance sheet is ${age} days old (${snapshot.periodEnd}).`);
        confidence = 'low';
    } else if (age > 200) {
        warnings.push(`The latest balance sheet is ${age} days old (${snapshot.periodEnd}).`);
        confidence = lower(confidence, 'medium');
    }

    // ── Methods ──
    const assetRatioPercent = snapshot.totalAssets > 0 ? Math.min(100, (zakatableTotal / snapshot.totalAssets) * 100) : 0;

    let perShare: MethodResults['perShare'] = null;
    const shares = snapshot.sharesOutstanding?.value;
    if (shares && shares > 0) {
        const zakatablePerShare = zakatableTotal / shares;
        perShare = { zakatablePerShare, currency: snapshot.currency };
        if (FOREIGN_FORMS.has(snapshot.form)) {
            warnings.push(
                'Foreign filer: if you hold ADRs, one ADR may represent more or fewer than one ordinary share, so check the ADR ratio before using the per-share figure.'
            );
        }
        if (price && price > 0 && snapshot.currency === 'USD') {
            perShare.price = price;
            perShare.zakatablePercentOfPrice = Math.min(100, (zakatablePerShare / price) * 100);
        }
    } else {
        warnings.push('Shares outstanding are not reported, so the per-share method is unavailable.');
    }

    return {
        ...meta,
        sector,
        asOf,
        status: 'ok',
        balanceSheet: {
            ...snapshot,
            filingIndexUrl: filingIndexUrl(meta.cik, snapshot.accession),
            zakatableTotal,
            unclassifiedCurrentAssets,
        },
        methods: { assetRatio: { zakatablePercent: assetRatioPercent }, perShare },
        options,
        confidence,
        warnings,
    };
}

/**
 * The % of a holding's market value to store on an Asset (zakatableAssetPercent)
 * for the scholar-selected method. Per-share needs a USD price to convert; if it
 * is unavailable the asset-ratio result is used and `usedMethod` says so.
 */
export function zakatablePercentForAsset(
    profile: StockZakatProfile,
    method: 'Asset_Ratio' | 'Per_Share'
): { percent: number; usedMethod: 'Asset_Ratio' | 'Per_Share' | 'Proxy' } {
    if (profile.status !== 'ok' || !profile.methods) {
        return { percent: profile.fallback?.proxyPercent ?? PROXY_ZAKATABLE_PERCENT, usedMethod: 'Proxy' };
    }
    const perShare = profile.methods.perShare?.zakatablePercentOfPrice;
    if (method === 'Per_Share' && perShare !== undefined) {
        return { percent: perShare, usedMethod: 'Per_Share' };
    }
    return { percent: profile.methods.assetRatio.zakatablePercent, usedMethod: 'Asset_Ratio' };
}
