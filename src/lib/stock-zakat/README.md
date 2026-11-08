# Filings-based stock Zakat

Replaces the blanket 30% proxy for long-term stock holdings. For each ticker we
read the company's own SEC XBRL filings and work out how much of the holding is
Zakatable, with a link to the exact filing.

## Flow

1. **Ticker → CIK**: SEC `company_tickers.json` (`BRK.B` is normalised to `BRK-B`).
2. **Company facts**: `data.sec.gov/api/xbrl/companyfacts/CIK##########.json`, plus `submissions` for the SIC industry code.
3. **Pick the balance sheet** (`extract.ts`): the latest 10-K/10-Q/20-F/40-F balance sheet **filed on or before the user's Zakat date**. Past years reproduce exactly; later restatements are never used for an earlier date.
4. **Read each line at that same date**: cash, short-term investments, receivables, inventory, total/current assets, current liabilities, shares. Companies tag lines differently and change tags over time, so each field has ordered fallback strategies (`concepts.ts`).
5. **Calculate** (`compute.ts`): both scholar methods side by side.
   - **Method A, asset ratio** (our Fiqh guide): Zakatable assets ÷ total assets → % of market value.
   - **Method B, per share** (AAOIFI-style, book value): Zakatable assets ÷ shares outstanding → $ per share. It becomes a % of market value once a USD price is supplied.
6. **Cross-check and grade confidence**: Zakatable lines are compared with total current assets (to catch double counting or big unclassified amounts), data age is checked, and sector rules apply. Banks and insurers without a classified balance sheet fall back to the 30% proxy until a scholar rules on them.

Fiqh switches (`StockZakatOptions`): include receivables, include short-term
investments, deduct current liabilities. **The defaults must be confirmed by the
reviewing scholar.**

## Using it

```ts
import { getStockZakatProfile, zakatablePercentForAsset } from '@/lib/stock-zakat';

const profile = await getStockZakatProfile({ ticker: 'AAPL', asOf: '2026-03-20' });
const { percent } = zakatablePercentForAsset(profile, 'Asset_Ratio');
// → store on the Asset as zakatableAssetPercent with zakatMethod 'Filings'
```

HTTP: `GET /api/stocks/zakat?ticker=AAPL&asOf=YYYY-MM-DD[&withPrice=1]`, or
`POST /api/stocks/zakat` with `{ tickers: [...], asOf }` (max 25). Login is required.
Only tickers are sent; share counts and values never leave the browser.

## Configuration

`SEC_USER_AGENT`: SEC requires an app name and contact email, e.g.
`SEC_USER_AGENT="NisabFlow support@yourdomain.com"`. Requests are throttled to
8/s (the SEC limit is 10/s).

## Tests

- `npm test` runs the offline unit tests on real, trimmed SEC data in `__fixtures__/` (Apple checked by hand against its FY2026 10-K).
- `npm run stock-zakat:golden [asOf] [TICKERS...]` runs a live check across 28 companies from different sectors.

## Known limits

- US SEC registrants only. Non-US listings fall back to the proxy or a manual %.
- ETFs and mutual funds have no balance sheet of their own; look-through via N-PORT holdings is the next step.
- Foreign filers (20-F/40-F) report annually and may use a non-USD currency or ADR ratios, so their data is flagged.
- Results are cached in memory per server instance; a persisted nightly dataset comes later.
