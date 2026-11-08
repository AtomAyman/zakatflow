import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStockPrice } from '@/lib/price-service';
import {
    getStockZakatProfile,
    TickerNotFoundError,
    todayIso,
} from '@/lib/stock-zakat/index';
import type { StockZakatOptions, StockZakatProfile } from '@/lib/stock-zakat/types';

/**
 * Filings-based Zakatable share of a stock.
 *
 * GET  /api/stocks/zakat?ticker=AAPL&asOf=2026-03-20[&withPrice=1]
 *        [&includeReceivables=0][&includeShortTermInvestments=0][&deductCurrentLiabilities=1]
 * POST /api/stocks/zakat  { tickers: string[] (max 25), asOf?, withPrice?, options? }
 *
 * Privacy: only tickers are sent here, never share counts or values. The
 * result is the company's public balance-sheet data; the browser applies it
 * to the user's holding.
 */

const TICKER_RE = /^[A-Za-z0-9][A-Za-z0-9.\-/]{0,9}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BATCH = 25;

class BadRequest extends Error {}

function parseAsOf(raw: string | null | undefined): string {
    const today = todayIso();
    if (!raw) return today;
    if (!DATE_RE.test(raw) || Number.isNaN(Date.parse(raw))) {
        throw new BadRequest('asOf must be a date in YYYY-MM-DD format.');
    }
    return raw > today ? today : raw; // a future Zakat date uses what is filed today
}

function parseTicker(raw: unknown): string {
    if (typeof raw !== 'string' || !TICKER_RE.test(raw.trim())) {
        throw new BadRequest(`Invalid ticker: ${String(raw).slice(0, 20)}`);
    }
    return raw.trim();
}

function parseBool(raw: string | null): boolean | undefined {
    if (raw === null) return undefined;
    return raw === '1' || raw.toLowerCase() === 'true';
}

function parseOptions(input: Record<string, unknown> | undefined): Partial<StockZakatOptions> {
    const out: Partial<StockZakatOptions> = {};
    if (!input) return out;
    for (const key of ['includeReceivables', 'includeShortTermInvestments', 'deductCurrentLiabilities'] as const) {
        if (typeof input[key] === 'boolean') out[key] = input[key] as boolean;
    }
    return out;
}

async function resolveOne(
    ticker: string,
    asOf: string,
    withPrice: boolean,
    options: Partial<StockZakatOptions>
): Promise<StockZakatProfile> {
    // Price is today's quote, so only fetch it for a current-date calculation.
    const price = withPrice && asOf === todayIso() ? await getStockPrice(ticker.toUpperCase().replace(/[./]/g, '-')) : undefined;
    return getStockZakatProfile({ ticker, asOf, price: price || undefined, options });
}

function errorResponse(error: unknown) {
    if (error instanceof BadRequest) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof TickerNotFoundError) {
        return NextResponse.json({ error: error.message, code: 'ticker_not_found' }, { status: 404 });
    }
    console.error('Stock Zakat error:', error);
    return NextResponse.json({ error: 'Could not read company filings right now. Try again shortly.' }, { status: 502 });
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const params = request.nextUrl.searchParams;
        const ticker = parseTicker(params.get('ticker'));
        const asOf = parseAsOf(params.get('asOf'));
        const options: Partial<StockZakatOptions> = {};
        for (const key of ['includeReceivables', 'includeShortTermInvestments', 'deductCurrentLiabilities'] as const) {
            const v = parseBool(params.get(key));
            if (v !== undefined) options[key] = v;
        }
        const data = await resolveOne(ticker, asOf, parseBool(params.get('withPrice')) ?? false, options);
        return NextResponse.json({ data });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => null)) as {
            tickers?: unknown;
            asOf?: string;
            withPrice?: boolean;
            options?: Record<string, unknown>;
        } | null;
        if (!body || !Array.isArray(body.tickers) || body.tickers.length === 0) {
            throw new BadRequest('Body must include a non-empty "tickers" array.');
        }
        if (body.tickers.length > MAX_BATCH) {
            throw new BadRequest(`At most ${MAX_BATCH} tickers per request.`);
        }
        const tickers = [...new Set(body.tickers.map(parseTicker))];
        const asOf = parseAsOf(body.asOf);
        const options = parseOptions(body.options);

        // Sequential: the SEC client rate-limits, and most lookups hit the cache.
        const results: Record<string, { data?: StockZakatProfile; error?: string }> = {};
        for (const t of tickers) {
            try {
                results[t] = { data: await resolveOne(t, asOf, body.withPrice === true, options) };
            } catch (e) {
                if (e instanceof TickerNotFoundError) results[t] = { error: e.message };
                else throw e;
            }
        }
        return NextResponse.json({ data: results });
    } catch (error) {
        return errorResponse(error);
    }
}
