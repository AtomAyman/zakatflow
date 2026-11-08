import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifySector, computeStockZakat, zakatablePercentForAsset, type CompanyMeta } from './compute';
import { extractBalanceSheet, ExtractionError } from './extract';
import { normalizeTicker } from './sec-client';
import { DEFAULT_STOCK_ZAKAT_OPTIONS, type CompanyFacts, type StockZakatOptions } from './types';

// Fixtures are real SEC companyfacts data (fetched Nov 2026), trimmed to the
// concepts the engine reads and to periods from mid-2023 onward.
function load(ticker: string): { facts: CompanyFacts; meta: CompanyMeta } {
    const raw = JSON.parse(readFileSync(join(__dirname, '__fixtures__', `${ticker}.json`), 'utf8'));
    return {
        facts: raw.facts,
        meta: {
            ticker,
            cik: raw.facts.cik,
            companyName: raw.facts.entityName,
            sic: raw.meta.sic,
            sicDescription: raw.meta.sicDescription,
        },
    };
}

function profile(ticker: string, asOf: string, options: Partial<StockZakatOptions> = {}, price?: number) {
    const { facts, meta } = load(ticker);
    const snapshot = extractBalanceSheet(facts, asOf);
    return computeStockZakat(meta, snapshot, asOf, { ...DEFAULT_STOCK_ZAKAT_OPTIONS, ...options }, price);
}

const M = 1e6;

describe('Apple — figures checked by hand against the FY2026 10-K balance sheet', () => {
    const p = profile('AAPL', '2026-11-08');
    const bs = p.balanceSheet!;

    it('uses the latest 10-K', () => {
        expect(p.status).toBe('ok');
        expect(bs.periodEnd).toBe('2026-09-26');
        expect(bs.form).toBe('10-K');
        expect(bs.accession).toBe('0000320193-26-000026');
        expect(bs.filingIndexUrl).toBe('https://www.sec.gov/Archives/edgar/data/320193/000032019326000026/');
    });

    it('reads each Zakatable line', () => {
        expect(bs.components.cash?.value).toBe(36_305 * M);
        expect(bs.components.shortTermInvestments?.value).toBe(20_417 * M);
        // Trade receivables + vendor non-trade receivables (separate balance-sheet lines)
        expect(bs.components.receivables?.value).toBe((43_817 + 39_896) * M);
        expect(bs.components.receivables?.concepts).toEqual(['AccountsReceivableNetCurrent', 'NontradeReceivablesCurrent']);
        expect(bs.components.inventory?.value).toBe(14_541 * M);
        expect(bs.zakatableTotal).toBe(154_976 * M);
        expect(bs.unclassifiedCurrentAssets).toBe((173_857 - 154_976) * M);
    });

    it('computes Method A (asset ratio) and Method B (per share)', () => {
        expect(p.methods!.assetRatio.zakatablePercent).toBeCloseTo((154_976 / 404_548) * 100, 6); // ≈ 38.31%
        expect(p.methods!.perShare!.zakatablePerShare).toBeCloseTo(154_976e6 / 14_532_259_000, 6); // ≈ $10.66
        expect(p.confidence).toBe('high');
        expect(p.warnings).toEqual([]);
    });

    it('expresses Method B as a % of a supplied USD price', () => {
        const withPrice = profile('AAPL', '2026-11-08', {}, 250);
        expect(withPrice.methods!.perShare!.zakatablePercentOfPrice).toBeCloseTo((154_976e6 / 14_532_259_000 / 250) * 100, 6);
    });
});

describe('point-in-time: only filings available on the Zakat date are used', () => {
    it('the day before the 10-K was filed, the prior 10-Q is used', () => {
        const p = profile('AAPL', '2026-11-02');
        expect(p.balanceSheet!.periodEnd).toBe('2026-06-27');
        expect(p.balanceSheet!.form).toBe('10-Q');
    });

    it('a Ramadan-2025 Zakat date uses the December 2024 quarter', () => {
        const p = profile('AAPL', '2025-03-30');
        expect(p.balanceSheet!.periodEnd).toBe('2024-12-28');
    });

    it('throws when nothing was filed yet', () => {
        expect(() => extractBalanceSheet(load('AAPL').facts, '2020-01-01')).toThrow(ExtractionError);
    });
});

describe('Fiqh options', () => {
    it('excluding receivables removes them from the Zakatable total', () => {
        const p = profile('AAPL', '2026-11-08', { includeReceivables: false });
        expect(p.balanceSheet!.zakatableTotal).toBe((154_976 - 83_713) * M);
    });

    it('excluding short-term investments removes them', () => {
        const p = profile('AAPL', '2026-11-08', { includeShortTermInvestments: false });
        expect(p.balanceSheet!.zakatableTotal).toBe((154_976 - 20_417) * M);
    });

    it('deducting current liabilities never goes below zero', () => {
        // Apple's current liabilities ($169.9B) exceed its Zakatable assets.
        const p = profile('AAPL', '2026-11-08', { deductCurrentLiabilities: true });
        expect(p.balanceSheet!.zakatableTotal).toBe(0);
        expect(p.methods!.assetRatio.zakatablePercent).toBe(0);
    });
});

describe('concept drift and alternative tags', () => {
    it('P&G: falls back to the restricted-cash total and says so', () => {
        const p = profile('PG', '2026-11-08');
        expect(p.balanceSheet!.components.cash?.concepts).toEqual([
            'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
        ]);
        expect(p.warnings.some((w) => w.includes('restricted cash'))).toBe(true);
    });

    it('Coca-Cola: short-term investments + current marketable securities', () => {
        const p = profile('KO', '2026-11-08');
        expect(p.balanceSheet!.components.shortTermInvestments?.concepts).toEqual([
            'OtherShortTermInvestments',
            'MarketableSecurities',
        ]);
    });

    it('Chevron: uses the combined accounts-and-notes receivable total, not AR alone', () => {
        const p = profile('CVX', '2026-11-08');
        expect(p.balanceSheet!.components.receivables?.concepts).toEqual(['AccountsNotesAndLoansReceivableNetCurrent']);
        // An all-zero marketable-securities line in the past is not reported as "missing".
        expect(p.warnings.some((w) => w.startsWith('Short-term investments'))).toBe(false);
    });

    it('Shopify: merchant loans are added to receivables; immaterial missing inventory is not flagged', () => {
        const p = profile('SHOP', '2026-11-08');
        expect(p.balanceSheet!.components.receivables?.concepts).toEqual([
            'AccountsAndOtherReceivablesNetCurrent',
            'NotesAndLoansReceivableNetCurrent',
        ]);
        expect(p.warnings.some((w) => w.startsWith('Inventory'))).toBe(false);
    });

    it('Meta: per-class share counts are missing, so weighted-average shares are used and flagged', () => {
        const p = profile('META', '2026-11-08');
        expect(p.balanceSheet!.sharesOutstanding?.approximate).toBe(true);
        expect(p.warnings.some((w) => w.includes('weighted-average'))).toBe(true);
    });
});

describe('sectors and foreign filers', () => {
    it('banks without a classified balance sheet fall back to the proxy', () => {
        const p = profile('JPM', '2026-11-08');
        expect(p.status).toBe('fallback');
        expect(p.sector).toBe('financial');
        expect(p.fallback?.proxyPercent).toBe(30);
    });

    it('REITs compute but are marked medium confidence', () => {
        const p = profile('O', '2026-11-08');
        expect(p.status).toBe('ok');
        expect(p.sector).toBe('reit');
        expect(p.confidence).toBe('medium');
        expect(p.methods!.assetRatio.zakatablePercent).toBeLessThan(5);
    });

    it('TSMC (IFRS 20-F): extracts, but stale data is low confidence with an ADR warning', () => {
        const p = profile('TSM', '2026-11-08');
        expect(p.balanceSheet!.taxonomy).toBe('ifrs-full');
        expect(p.balanceSheet!.form).toBe('20-F');
        expect(p.confidence).toBe('low');
        expect(p.warnings.some((w) => w.includes('ADR'))).toBe(true);
    });

    it('classifies SIC codes', () => {
        expect(classifySector('6021')).toBe('financial');
        expect(classifySector('6331')).toBe('financial');
        expect(classifySector('6798')).toBe('reit');
        expect(classifySector('3571')).toBe('standard');
        expect(classifySector(null)).toBe('standard');
    });
});

describe('ticker normalisation', () => {
    it('maps share-class punctuation to SEC format', () => {
        expect(normalizeTicker(' brk.b ')).toBe('BRK-B');
        expect(normalizeTicker('BF/B')).toBe('BF-B');
        expect(normalizeTicker('aapl')).toBe('AAPL');
    });
});

describe('zakatablePercentForAsset', () => {
    it('returns the asset ratio, the per-share % of price, or the proxy', () => {
        const p = profile('AAPL', '2026-11-08', {}, 250);
        expect(zakatablePercentForAsset(p, 'Asset_Ratio').percent).toBeCloseTo(38.3087, 3);
        expect(zakatablePercentForAsset(p, 'Per_Share')).toEqual({
            percent: p.methods!.perShare!.zakatablePercentOfPrice,
            usedMethod: 'Per_Share',
        });
        // No price → per-share cannot be expressed as % of market value
        expect(zakatablePercentForAsset(profile('AAPL', '2026-11-08'), 'Per_Share').usedMethod).toBe('Asset_Ratio');
        expect(zakatablePercentForAsset(profile('JPM', '2026-11-08'), 'Asset_Ratio')).toEqual({ percent: 30, usedMethod: 'Proxy' });
    });
});
