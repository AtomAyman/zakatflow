// ─── Reading text taken from a screenshot ─────────────────
//
// A bank or brokerage app screenshot, run through on-device OCR, comes out as
// lines like "TD Chequing   $4,210.55" or "VFV  12 shares  $1,820.40".
// This turns those lines into the same balances and holdings a CSV gives.
// It never guesses silently: every row goes to the review table.

import type { ImportedBalance } from './parse';
import { detectNumberFormat, parseAmount } from './table';
import type { ImportedHolding } from './types';

export interface StatementText {
  balances: ImportedBalance[];
  holdings: ImportedHolding[];
  /** Lines that had text but no amount, for the user to look at. */
  unread: string[];
}

// An amount: optional sign/currency, digits with separators, optional cents.
const AMOUNT = /(-?\(?\s*(?:[$£€]|CA\$|US\$|C\$|A\$|CAD|USD|GBP|EUR)?\s?-?\d{1,3}(?:[,.\s ]\d{3})*(?:[.,]\d{1,2})?\)?)(?:\s*(CAD|USD|GBP|EUR))?\s*$/;
const SHARES = /(\d+(?:[.,]\d+)?)\s*(?:shares?|sh|units?|qty)\b/i;
const TICKER = /^([A-Z]{1,5}(?:[.-][A-Z]{1,3})?)\b/;
const NOISE = /^(total|balance|available|today|change|gain|loss|return|portfolio value|net worth|accounts?|search|home)\b/i;

function currencyOf(s: string): string | undefined {
  if (/CA\$|C\$|\bCAD\b/.test(s)) return 'CAD';
  if (/US\$|\bUSD\b/.test(s)) return 'USD';
  if (/£|\bGBP\b/.test(s)) return 'GBP';
  if (/€|\bEUR\b/.test(s)) return 'EUR';
  return undefined;
}

export function parseStatementText(text: string): StatementText {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 2);
  const amounts = lines.map((l) => l.match(AMOUNT)?.[1] ?? '').filter(Boolean);
  const nf = detectNumberFormat(amounts);
  const out: StatementText = { balances: [], holdings: [], unread: [] };

  for (const line of lines) {
    const m = line.match(AMOUNT);
    if (!m || m.index == null) { if (/[a-z]/i.test(line)) out.unread.push(line); continue; }
    const label = line.slice(0, m.index).replace(/[:|•·]+$/, '').trim();
    const value = parseAmount(m[1], nf);
    if (!label || value == null || NOISE.test(label)) continue;
    if (!/[a-z]/i.test(label)) continue; // a bare number, e.g. a date or a percentage line

    const shares = label.match(SHARES);
    const ticker = label.match(TICKER);
    if (shares && ticker) {
      out.holdings.push({
        symbol: ticker[1],
        quantity: parseAmount(shares[1], nf) ?? 0,
        marketValue: value,
        currency: currencyOf(line),
      });
      continue;
    }
    out.balances.push({ name: label, value, currency: currencyOf(line) });
  }
  return out;
}
