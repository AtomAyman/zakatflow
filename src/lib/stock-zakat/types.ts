// ─── Filings-based stock Zakat: shared types ──────────────────────────────
//
// We read a company's own SEC XBRL filings and work out how much of a
// shareholding is Zakatable, instead of the blanket 30% proxy.

/** One XBRL fact as returned by data.sec.gov/api/xbrl/companyfacts. */
export interface XbrlFact {
    end: string;        // period end (instant facts) — YYYY-MM-DD
    start?: string;     // present only on duration facts (income statement etc.)
    val: number;
    accn: string;       // accession number of the filing that reported it
    fy?: number;
    fp?: string;
    form: string;       // 10-K, 10-Q, 20-F, ...
    filed: string;      // YYYY-MM-DD
    frame?: string;
}

export interface XbrlConcept {
    label?: string | null;
    description?: string | null;
    units: Record<string, XbrlFact[]>;
}

/** Shape of the companyfacts JSON (only what we use). */
export interface CompanyFacts {
    cik: number;
    entityName: string;
    facts: Record<string, Record<string, XbrlConcept>>; // taxonomy → concept → data
}

export type Taxonomy = 'us-gaap' | 'ifrs-full';

/** Zakatable balance-sheet components (the guide's "cash, raw material, goods"). */
export type ComponentKey = 'cash' | 'shortTermInvestments' | 'receivables' | 'inventory';

export interface ExtractedValue {
    value: number;
    /** XBRL concepts that were summed to produce the value. */
    concepts: string[];
}

export interface BalanceSheetSnapshot {
    taxonomy: Taxonomy;
    currency: string;           // reporting unit used (e.g. USD, TWD)
    periodEnd: string;          // balance-sheet date used
    form: string;               // form of the filing that reported total assets
    accession: string;
    filed: string;
    components: Record<ComponentKey, ExtractedValue | null>;
    totalAssets: number;
    currentAssets: ExtractedValue | null;
    currentLiabilities: ExtractedValue | null;
    sharesOutstanding: (ExtractedValue & { approximate: boolean }) | null;
    warnings: string[];
}

export type SectorKind = 'standard' | 'financial' | 'reit';

export type Confidence = 'high' | 'medium' | 'low';

/** Fiqh switches. Defaults must be confirmed by the reviewing scholar. */
export interface StockZakatOptions {
    /** Count trade/non-trade receivables as Zakatable (the guide's strong-debt ruling). */
    includeReceivables: boolean;
    /** Count short-term investments / marketable securities as Zakatable. */
    includeShortTermInvestments: boolean;
    /** Subtract current liabilities from Zakatable assets (some scholars' net approach). */
    deductCurrentLiabilities: boolean;
}

export const DEFAULT_STOCK_ZAKAT_OPTIONS: StockZakatOptions = {
    includeReceivables: true,
    includeShortTermInvestments: true,
    deductCurrentLiabilities: false,
};

/** Fallback used when filings cannot give a reliable answer. */
export const PROXY_ZAKATABLE_PERCENT = 30;

export interface MethodResults {
    /**
     * Method A — asset ratio (our Fiqh guide, "Zakāt on Stocks"):
     *   Zakatable assets ÷ total assets, applied to the holding's MARKET value.
     */
    assetRatio: {
        zakatablePercent: number;       // % of market value that is Zakatable
    };
    /**
     * Method B — Zakatable assets per share (AAOIFI-style, book value):
     *   Zakatable assets ÷ shares outstanding, × shares held.
     */
    perShare: {
        zakatablePerShare: number;      // in `currency`
        currency: string;
        /** zakatablePerShare ÷ price × 100, when a price was supplied. */
        zakatablePercentOfPrice?: number;
        price?: number;
    } | null;
}

export interface StockZakatProfile {
    ticker: string;
    cik: number;
    companyName: string;
    sic: string | null;
    sicDescription: string | null;
    sector: SectorKind;
    asOf: string;
    status: 'ok' | 'fallback';
    /** Present when status === 'fallback'. */
    fallback?: {
        reason: string;
        proxyPercent: number;
    };
    balanceSheet?: BalanceSheetSnapshot & {
        filingIndexUrl: string;
        zakatableTotal: number;
        /** Current assets we did not classify as Zakatable (prepaids, other). */
        unclassifiedCurrentAssets: number | null;
    };
    methods?: MethodResults;
    options: StockZakatOptions;
    confidence: Confidence;
    warnings: string[];
}
