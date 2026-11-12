// ─── Generic CSV holdings import (free, browser-only) ─────
//
// Reads a brokerage "holdings" or "positions" CSV export. Columns are found
// by header name, so most brokers' exports work without a preset. Nothing
// here makes a network call.

import type { FileHoldingsSource, ImportedHolding, ImportResult } from './types';

/** Header names we accept for each field, lower-case. */
const HEADERS = {
  symbol: ['symbol', 'ticker', 'security symbol', 'instrument', 'code'],
  name: ['name', 'description', 'security', 'security name', 'security description'],
  quantity: ['quantity', 'qty', 'shares', 'units', 'quantity held'],
  currency: ['currency', 'ccy', 'market value currency'],
  marketValue: ['market value', 'value', 'current value', 'marketvalue', 'total value'],
  accountName: ['account', 'account name', 'account type', 'account number'],
} as const;

type Field = keyof typeof HEADERS;

/** Splits CSV text into rows, handling quoted fields with commas and quotes. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

function toNumber(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const cleaned = raw.replace(/[$£€,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  if (cleaned === '' || cleaned === '--') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Finds the header row (brokers often put a title or account line first)
 * and maps each field to a column index.
 */
function findColumns(rows: string[][]): { headerRow: number; cols: Partial<Record<Field, number>> } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = rows[r].map((c) => c.trim().toLowerCase());
    const cols: Partial<Record<Field, number>> = {};
    for (const field of Object.keys(HEADERS) as Field[]) {
      const idx = cells.findIndex((c) => (HEADERS[field] as readonly string[]).includes(c));
      if (idx >= 0) cols[field] = idx;
    }
    if (cols.symbol != null && cols.quantity != null) return { headerRow: r, cols };
  }
  return null;
}

export function parseHoldingsCsv(text: string): ImportResult {
  const rows = parseCsvRows(text);
  const found = findColumns(rows);
  if (!found) {
    return {
      holdings: [],
      skipped: [],
      warnings: ['Could not find a header row with a symbol column and a quantity column.'],
    };
  }
  const { headerRow, cols } = found;
  const holdings: ImportedHolding[] = [];
  const skipped: ImportResult['skipped'] = [];
  const get = (row: string[], f: Field) => (cols[f] != null ? row[cols[f]!]?.trim() : undefined);

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const symbol = get(row, 'symbol');
    const quantity = toNumber(get(row, 'quantity'));
    if (!symbol) { skipped.push({ row: r + 1, reason: 'No symbol' }); continue; }
    if (quantity == null) { skipped.push({ row: r + 1, reason: `No quantity for ${symbol}` }); continue; }
    holdings.push({
      symbol: symbol.toUpperCase(),
      name: get(row, 'name') || undefined,
      quantity,
      currency: get(row, 'currency')?.toUpperCase() || undefined,
      marketValue: toNumber(get(row, 'marketValue')),
      accountName: get(row, 'accountName') || undefined,
    });
  }
  const warnings = cols.marketValue == null
    ? ['No market value column; values will come from live prices.']
    : [];
  return { holdings, skipped, warnings };
}

export const genericCsvSource: FileHoldingsSource = {
  id: 'csv-generic',
  label: 'Brokerage CSV export',
  kind: 'file',
  regions: ['US', 'CA', 'UK'],
  feature: 'csvImport',
  dataLeavesBrowser: false,
  accept: '.csv,text/csv',
  parse: parseHoldingsCsv,
};
