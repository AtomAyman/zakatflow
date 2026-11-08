// ─── SEC EDGAR client ─────────────────────────────────────────────────────
//
// SEC fair-access rules: at most 10 requests/second, and a User-Agent that
// identifies the app and a contact address. Set SEC_USER_AGENT, e.g.
//   SEC_USER_AGENT="NisabFlow support@yourdomain.com"
// Only public company data is fetched here, never anything about the user.

import type { CompanyFacts } from './types';

const USER_AGENT = process.env.SEC_USER_AGENT || 'NisabFlow/0.1 (set SEC_USER_AGENT to an app name and contact email)';
const MIN_INTERVAL_MS = 125; // ≤ 8 req/s, under SEC's 10 req/s limit

export class SecError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

// ── Simple process-wide rate limiter ──
let nextSlot = 0;
async function throttle(): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function secFetchJson<T>(url: string): Promise<T> {
    await throttle();
    // Company facts files can exceed Next's 2 MB data-cache limit, so we cache
    // the small extracted results ourselves instead.
    const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        cache: 'no-store',
    });
    if (!res.ok) {
        throw new SecError(`SEC request failed (${res.status}) for ${url}`, res.status);
    }
    return (await res.json()) as T;
}

// ── Tiny TTL cache ──
export class TtlCache<V> {
    private map = new Map<string, { value: V; expires: number }>();
    constructor(private ttlMs: number, private maxEntries: number) {}

    get(key: string): V | undefined {
        const hit = this.map.get(key);
        if (!hit) return undefined;
        if (hit.expires < Date.now()) {
            this.map.delete(key);
            return undefined;
        }
        // refresh LRU position
        this.map.delete(key);
        this.map.set(key, hit);
        return hit.value;
    }

    set(key: string, value: V): void {
        this.map.delete(key);
        this.map.set(key, { value, expires: Date.now() + this.ttlMs });
        while (this.map.size > this.maxEntries) {
            const oldest = this.map.keys().next().value;
            if (oldest === undefined) break;
            this.map.delete(oldest);
        }
    }
}

const HOUR = 3_600_000;

// ── Ticker → CIK ──
export interface TickerEntry {
    cik: number;
    ticker: string;
    title: string;
}

let tickerMap: { map: Map<string, TickerEntry>; expires: number } | null = null;

/** Normalise user input to SEC's ticker format (BRK.B / brk/b → BRK-B). */
export function normalizeTicker(input: string): string {
    return input.trim().toUpperCase().replace(/[./]/g, '-');
}

export async function lookupTicker(input: string): Promise<TickerEntry | null> {
    if (!tickerMap || tickerMap.expires < Date.now()) {
        const raw = await secFetchJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
            'https://www.sec.gov/files/company_tickers.json'
        );
        const map = new Map<string, TickerEntry>();
        for (const e of Object.values(raw)) {
            map.set(e.ticker.toUpperCase(), { cik: e.cik_str, ticker: e.ticker.toUpperCase(), title: e.title });
        }
        tickerMap = { map, expires: Date.now() + 24 * HOUR };
    }
    return tickerMap.map.get(normalizeTicker(input)) ?? null;
}

const pad = (cik: number) => String(cik).padStart(10, '0');

// ── Company facts (large: keep only a handful in memory) ──
const factsCache = new TtlCache<CompanyFacts>(6 * HOUR, 8);

export async function getCompanyFacts(cik: number): Promise<CompanyFacts> {
    const key = String(cik);
    const hit = factsCache.get(key);
    if (hit) return hit;
    const facts = await secFetchJson<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${pad(cik)}.json`);
    factsCache.set(key, facts);
    return facts;
}

// ── Submissions metadata (industry code) ──
export interface CompanySubmissionsMeta {
    name: string;
    sic: string | null;
    sicDescription: string | null;
}

const submissionsCache = new TtlCache<CompanySubmissionsMeta>(24 * HOUR, 2000);

export async function getCompanyMeta(cik: number): Promise<CompanySubmissionsMeta> {
    const key = String(cik);
    const hit = submissionsCache.get(key);
    if (hit) return hit;
    const raw = await secFetchJson<{ name: string; sic?: string; sicDescription?: string }>(
        `https://data.sec.gov/submissions/CIK${pad(cik)}.json`
    );
    const meta = { name: raw.name, sic: raw.sic || null, sicDescription: raw.sicDescription || null };
    submissionsCache.set(key, meta);
    return meta;
}
