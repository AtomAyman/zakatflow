import { type PriceData } from './types';

// ─── Cache ────────────────────────────────────────────────

let cachedPrices: PriceData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Common currency pairs to fetch against USD
const FOREX_PAIRS = [
    'CAD', 'GBP', 'EUR', 'PKR', 'INR', 'SAR', 'AED', 'BDT', 'EGP', 'TRY', 'MYR',
];

// ─── Yahoo Finance Helper ─────────────────────────────────

async function yahooQuote(symbol: string): Promise<number | null> {
    try {
        const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
            { next: { revalidate: 300 } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
    } catch {
        return null;
    }
}

// ─── Gold & Silver Prices (Yahoo Finance Futures) ─────────

async function fetchMetalPrices(): Promise<{ goldPerGram: number; silverPerGram: number }> {
    const TROY_OZ_TO_GRAMS = 31.1035;

    // Gold futures (GC=F) and Silver futures (SI=F) on Yahoo Finance
    const [goldPricePerOz, silverPricePerOz] = await Promise.all([
        yahooQuote('GC=F'),
        yahooQuote('SI=F'),
    ]);

    const goldPerGram = goldPricePerOz ? goldPricePerOz / TROY_OZ_TO_GRAMS : 88;
    const silverPerGram = silverPricePerOz ? silverPricePerOz / TROY_OZ_TO_GRAMS : 1.05;

    return { goldPerGram, silverPerGram };
}

// ─── Exchange Rates (Yahoo Finance Forex) ─────────────────

async function fetchExchangeRates(): Promise<Record<string, number>> {
    const rates: Record<string, number> = { USD: 1 };

    // Fetch rates from Yahoo Finance forex pairs (XXXUSD=X gives USD value of 1 unit of XXX)
    // We want: how many USD is 1 unit of foreign currency
    const promises = FOREX_PAIRS.map(async (cur) => {
        // For USD-based pairs, XXXUSD=X gives the price of 1 XXX in USD
        const price = await yahooQuote(`${cur}USD=X`);
        if (price && price > 0) {
            // Yahoo returns price of 1 unit of the first currency in the second
            // CADUSD=X = price of 1 CAD in USD — but Yahoo convention is actually
            // the pair format where CADUSD=X gives how much 1 CAD costs in USD
            rates[cur] = price;
        }
    });

    await Promise.all(promises);

    // If some rates failed, use reasonable fallbacks
    const fallbacks: Record<string, number> = {
        CAD: 0.74, GBP: 1.27, EUR: 1.08, PKR: 0.0036, INR: 0.012,
        SAR: 0.267, AED: 0.272, BDT: 0.0084, EGP: 0.020, TRY: 0.029, MYR: 0.22,
    };

    for (const cur of FOREX_PAIRS) {
        if (!rates[cur]) {
            rates[cur] = fallbacks[cur] ?? 1;
        }
    }

    return rates;
}

// ─── Combined Price Fetcher ───────────────────────────────

export async function getMetalPrices(): Promise<PriceData> {
    const now = Date.now();
    if (cachedPrices && now - cacheTimestamp < CACHE_TTL) {
        return cachedPrices;
    }

    const [metals, exchangeRates] = await Promise.all([
        fetchMetalPrices(),
        fetchExchangeRates(),
    ]);

    cachedPrices = {
        goldPerGram: metals.goldPerGram,
        silverPerGram: metals.silverPerGram,
        exchangeRates,
        lastUpdated: new Date().toISOString(),
    };
    cacheTimestamp = now;
    return cachedPrices;
}

// ─── Convert to Base Currency ─────────────────────────────

export function convertToBaseCurrency(
    amount: number,
    fromCurrency: string,
    baseCurrency: string,
    exchangeRates: Record<string, number>
): number {
    if (fromCurrency === baseCurrency) return amount;

    // Convert to USD first, then to base currency
    const fromToUSD = exchangeRates[fromCurrency] ?? 1;
    const baseToUSD = exchangeRates[baseCurrency] ?? 1;

    // amount in fromCurrency → USD → baseCurrency
    const amountInUSD = amount * fromToUSD;
    const amountInBase = amountInUSD / baseToUSD;

    return amountInBase;
}

// ─── Stock Price ──────────────────────────────────────────

const stockCache: Record<string, { price: number; timestamp: number }> = {};

export async function getStockPrice(ticker: string): Promise<number> {
    const now = Date.now();
    const cached = stockCache[ticker];
    if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.price;
    }

    const price = await yahooQuote(ticker);
    if (price !== null) {
        stockCache[ticker] = { price, timestamp: now };
        return price;
    }

    return 0;
}
