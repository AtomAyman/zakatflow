// ─── Filings-based stock Zakat: public entry point ────────────────────────

import { computeStockZakat, fallbackProfile, type CompanyMeta } from './compute';
import { extractBalanceSheet, ExtractionError } from './extract';
import { getCompanyFacts, getCompanyMeta, lookupTicker, normalizeTicker, SecError, TtlCache } from './sec-client';
import { DEFAULT_STOCK_ZAKAT_OPTIONS, type StockZakatOptions, type StockZakatProfile } from './types';

export * from './types';
export { computeStockZakat, classifySector, zakatablePercentForAsset } from './compute';
export { extractBalanceSheet, ExtractionError } from './extract';
export { normalizeTicker } from './sec-client';

export class TickerNotFoundError extends Error {}

export interface StockZakatRequest {
    ticker: string;
    /** The user's Zakat (Hawl) date, YYYY-MM-DD. Defaults to today. */
    asOf?: string;
    /** Current share price in USD, used only to express Method B as a % of price. */
    price?: number;
    options?: Partial<StockZakatOptions>;
}

const profileCache = new TtlCache<StockZakatProfile>(12 * 3_600_000, 1000);

export function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export async function getStockZakatProfile(req: StockZakatRequest): Promise<StockZakatProfile> {
    const asOf = req.asOf ?? todayIso();
    const options: StockZakatOptions = { ...DEFAULT_STOCK_ZAKAT_OPTIONS, ...req.options };
    const ticker = normalizeTicker(req.ticker);

    const cacheKey = JSON.stringify([ticker, asOf, req.price ?? null, options]);
    const cached = profileCache.get(cacheKey);
    if (cached) return cached;

    const entry = await lookupTicker(ticker);
    if (!entry) {
        throw new TickerNotFoundError(
            `"${req.ticker}" is not a US SEC-registered ticker. Non-US listings are not supported yet; use the 30% proxy or a manual percentage.`
        );
    }

    const [secMeta, facts] = await Promise.all([
        getCompanyMeta(entry.cik),
        getCompanyFacts(entry.cik).catch((e: unknown) => {
            // Some registrants (many funds, very new listings) have no XBRL facts.
            if (e instanceof SecError && e.status === 404) return null;
            throw e;
        }),
    ]);

    const meta: CompanyMeta = {
        ticker: entry.ticker,
        cik: entry.cik,
        companyName: secMeta.name || entry.title,
        sic: secMeta.sic,
        sicDescription: secMeta.sicDescription,
    };

    let profile: StockZakatProfile;
    if (!facts) {
        profile = fallbackProfile(meta, asOf, options, `${meta.companyName} has no structured (XBRL) financial data on EDGAR. Using the 30% proxy.`);
    } else {
        try {
            const snapshot = extractBalanceSheet(facts, asOf);
            profile = computeStockZakat(meta, snapshot, asOf, options, req.price);
        } catch (e) {
            if (!(e instanceof ExtractionError)) throw e;
            profile = fallbackProfile(meta, asOf, options, `${e.message} Using the 30% proxy.`);
        }
    }

    profileCache.set(cacheKey, profile);
    return profile;
}
