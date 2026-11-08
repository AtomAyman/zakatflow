/**
 * Live sanity check of the filings-based stock Zakat engine against a
 * cross-sector set of companies. Hits SEC EDGAR (public data only).
 *
 *   SEC_USER_AGENT="NisabFlow you@example.com" npx tsx scripts/stock-zakat-golden.ts [asOf] [TICKERS...]
 */
import { getStockZakatProfile } from '../src/lib/stock-zakat';

const DEFAULT_TICKERS =
    'AAPL MSFT GOOGL AMZN NVDA META TSLA WMT COST KO PG JNJ PFE XOM CVX HD NKE JPM BAC BRK-B O AMT PLD MRNA UNH TSM ASML SHOP'.split(' ');

const B = (n?: number | null) => (n == null ? '—' : `${(n / 1e9).toFixed(1)}B`);

async function main() {
    const [asOfArg, ...rest] = process.argv.slice(2);
    const asOf = asOfArg && /^\d{4}-\d{2}-\d{2}$/.test(asOfArg) ? asOfArg : undefined;
    const tickers = rest.length ? rest : asOfArg && !asOf ? [asOfArg] : DEFAULT_TICKERS;

    console.log('ticker | period     | form | cash | stInv | recv | inv | curAssets | unclass | totAssets | A % | B $/sh | conf | warnings');
    for (const t of tickers) {
        try {
            const p = await getStockZakatProfile({ ticker: t, asOf });
            if (p.status === 'fallback' || !p.balanceSheet || !p.methods) {
                console.log(`${t} | FALLBACK (${p.sector}) | ${p.fallback?.reason}`);
                continue;
            }
            const bs = p.balanceSheet;
            const c = bs.components;
            console.log(
                [
                    t,
                    bs.periodEnd,
                    bs.form,
                    B(c.cash?.value),
                    B(c.shortTermInvestments?.value),
                    B(c.receivables?.value),
                    B(c.inventory?.value),
                    B(bs.currentAssets?.value),
                    B(bs.unclassifiedCurrentAssets),
                    B(bs.totalAssets) + (bs.currency !== 'USD' ? ` ${bs.currency}` : ''),
                    p.methods.assetRatio.zakatablePercent.toFixed(1) + '%',
                    p.methods.perShare ? p.methods.perShare.zakatablePerShare.toFixed(2) : '—',
                    p.confidence,
                    p.warnings.join(' / '),
                ].join(' | ')
            );
        } catch (e) {
            console.log(`${t} | ERROR ${(e as Error).message}`);
        }
    }
}

main();
