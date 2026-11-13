// ─── Reading an import file ───────────────────────────────
//
// One entry point for every spreadsheet-like file. It works out which of the
// three things ZakatFlow can take in the file holds, then reads it:
//
//   holdings      positions from a brokerage (symbol + quantity)
//   balances      accounts or line items with a value: a bank or finance-app
//                 export, a net-worth sheet, or an old manual Zakat sheet
//   zakat_years   past Zakat calculations, one row per year
//
// Transactions are deliberately not read: Zakat needs what you hold on your
// Hawl date, not how it got there.

import { detectNumberFormat, findColumn, parseAmount, readTable, type NumberFormat, type Table } from './table';
import type { ImportedHolding, ImportResult } from './types';

export type ImportKind = 'holdings' | 'balances' | 'zakat_years';

export interface ImportedBalance {
  name: string;
  value: number;
  currency?: string;
  /** Type or category text from the file, if any (helps classification). */
  typeHint?: string;
  asOf?: string;
}

export interface ImportedZakatYear {
  year: string;               // "2025" or a Hijri year like "1446"
  totalAssets?: number;
  totalLiabilities?: number;
  netZakatable?: number;
  nisab?: number;
  zakatDue?: number;
  zakatPaid?: number;
  currency?: string;
  notes?: string;
}

export interface ParsedFile {
  kind: ImportKind;
  numberFormat: NumberFormat;
  holdings: ImportedHolding[];
  balances: ImportedBalance[];
  zakatYears: ImportedZakatYear[];
  skipped: ImportResult['skipped'];
  warnings: string[];
  /** Headers as found, so the review screen can show what was read. */
  headers: string[];
}

export const ALIASES = {
  symbol: ['symbol', 'ticker', 'security symbol', 'instrument', 'code', 'stock symbol'],
  securityName: ['description', 'security', 'security name', 'security description', 'name', 'holding'],
  quantity: ['quantity', 'qty', 'shares', 'units', 'quantity held', 'no. of shares', 'number of shares'],
  currency: ['currency', 'ccy', 'market value currency', 'account currency'],
  marketValue: ['market value', 'current value', 'marketvalue', 'total value', 'value', 'position value', 'market val'],
  price: ['price', 'last price', 'market price', 'current price', 'close', 'last'],
  exchange: ['exchange', 'market', 'exchange mic', 'mic', 'exchange operating mic'],
  account: ['account', 'account name', 'account number', 'account nickname', 'portfolio'],
  accountType: ['account type', 'type', 'category', 'class', 'asset class', 'kind'],
  balance: ['balance', 'current balance', 'amount', 'value', 'market value', 'total', 'worth', 'net value'],
  itemName: ['account', 'account name', 'name', 'item', 'description', 'asset', 'label', 'institution'],
  date: ['date', 'as of', 'as of date', 'balance date', 'updated'],
  year: ['year', 'zakat year', 'hijri year', 'calendar year', 'period'],
  zakatDue: ['zakat due', 'zakat', 'zakat amount', 'zakat payable', 'zakat owed', 'total zakat'],
  zakatPaid: ['zakat paid', 'paid', 'amount paid', 'total paid'],
  totalAssets: ['total assets', 'assets', 'total wealth', 'gross assets', 'wealth'],
  totalLiabilities: ['total liabilities', 'liabilities', 'debts', 'deductions'],
  netZakatable: ['net zakatable', 'zakatable', 'zakatable wealth', 'net wealth', 'net zakatable wealth', 'zakatable amount'],
  nisab: ['nisab', 'nisab threshold', 'nisab used'],
  notes: ['notes', 'note', 'comments', 'recipients'],
} as const;

const lower = (cells: string[]) => cells.map((c) => c.trim().toLowerCase());

function looksLikeHeader(cells: string[]): boolean {
  const l = lower(cells);
  const hits = Object.values(ALIASES).flat().filter((a) => l.includes(a)).length;
  return hits >= 2;
}

/** Decides what the file holds from its headers. */
export function detectKind(headers: string[]): ImportKind | null {
  const has = (k: keyof typeof ALIASES) => findColumn(headers, ALIASES[k]) != null;
  if (has('year') && (has('zakatDue') || has('zakatPaid'))) return 'zakat_years';
  if (has('symbol') && has('quantity')) return 'holdings';
  if (has('itemName') && has('balance')) return 'balances';
  return null;
}

export function parseImportFile(text: string, forceKind?: ImportKind): ParsedFile | { error: string } {
  const table = readTable(text, looksLikeHeader);
  if (!table) return { error: 'Could not find a header row. The file needs column names such as Symbol and Quantity, or Account and Balance.' };
  const kind = forceKind ?? detectKind(table.headers);
  if (!kind) {
    return { error: `Could not tell what this file holds from its columns (${table.headers.filter(Boolean).join(', ')}).` };
  }
  const col = (k: keyof typeof ALIASES) => findColumn(table.headers, ALIASES[k]);
  const numericCols = (['quantity', 'marketValue', 'price', 'balance', 'zakatDue', 'zakatPaid', 'totalAssets'] as const)
    .map(col).filter((c): c is number => c != null);
  const samples = table.rows.slice(0, 50).flatMap((r) => numericCols.map((c) => r[c] ?? ''));
  const numberFormat = detectNumberFormat(samples);

  const base: ParsedFile = { kind, numberFormat, holdings: [], balances: [], zakatYears: [], skipped: [], warnings: [], headers: table.headers };
  if (kind === 'holdings') readHoldings(table, numberFormat, base);
  else if (kind === 'balances') readBalances(table, numberFormat, base);
  else readZakatYears(table, numberFormat, base);
  if (numberFormat !== '1,234.56') base.warnings.push(`Numbers read in the ${numberFormat} format.`);
  return base;
}

function cell(row: string[], i: number | undefined): string | undefined {
  if (i == null) return undefined;
  const v = row[i]?.trim();
  return v ? v : undefined;
}

function readHoldings(t: Table, nf: NumberFormat, out: ParsedFile) {
  const c = {
    symbol: findColumn(t.headers, ALIASES.symbol),
    name: findColumn(t.headers, ALIASES.securityName.filter((a) => !ALIASES.symbol.includes(a as never))),
    quantity: findColumn(t.headers, ALIASES.quantity),
    currency: findColumn(t.headers, ALIASES.currency),
    marketValue: findColumn(t.headers, ALIASES.marketValue),
    price: findColumn(t.headers, ALIASES.price),
    exchange: findColumn(t.headers, ALIASES.exchange),
    account: findColumn(t.headers, ALIASES.account),
  };
  t.rows.forEach((row, i) => {
    const line = t.headerRowIndex + i + 2;
    const symbol = cell(row, c.symbol);
    const quantity = parseAmount(cell(row, c.quantity), nf);
    if (!symbol) { out.skipped.push({ row: line, reason: 'No symbol (often a cash or total line)' }); return; }
    if (/^(total|subtotal|cash|grand total)$/i.test(symbol)) { out.skipped.push({ row: line, reason: `${symbol} line` }); return; }
    if (quantity == null) { out.skipped.push({ row: line, reason: `No quantity for ${symbol}` }); return; }
    const price = parseAmount(cell(row, c.price), nf);
    let marketValue = parseAmount(cell(row, c.marketValue), nf);
    if (marketValue == null && price != null) marketValue = Math.round(price * quantity * 100) / 100;
    out.holdings.push({
      symbol: symbol.toUpperCase(),
      name: cell(row, c.name),
      quantity,
      currency: cell(row, c.currency)?.toUpperCase(),
      marketValue,
      accountName: cell(row, c.account),
      exchange: cell(row, c.exchange)?.toUpperCase(),
    });
  });
  if (c.marketValue == null && c.price == null) out.warnings.push('No value or price column; you will need to enter values.');
}

function readBalances(t: Table, nf: NumberFormat, out: ParsedFile) {
  const c = {
    name: findColumn(t.headers, ALIASES.itemName),
    balance: findColumn(t.headers, ALIASES.balance),
    currency: findColumn(t.headers, ALIASES.currency),
    type: findColumn(t.headers, ALIASES.accountType),
    date: findColumn(t.headers, ALIASES.date),
  };
  const rows: ImportedBalance[] = [];
  t.rows.forEach((row, i) => {
    const line = t.headerRowIndex + i + 2;
    const name = cell(row, c.name);
    const value = parseAmount(cell(row, c.balance), nf);
    if (!name) { out.skipped.push({ row: line, reason: 'No account or item name' }); return; }
    if (/^(total|subtotal|net worth|grand total)$/i.test(name)) { out.skipped.push({ row: line, reason: `${name} line` }); return; }
    if (value == null) { out.skipped.push({ row: line, reason: `No value for ${name}` }); return; }
    rows.push({
      name,
      value,
      currency: cell(row, c.currency)?.toUpperCase(),
      typeHint: c.type != null && c.type !== c.name ? cell(row, c.type) : undefined,
      asOf: normalizeDate(cell(row, c.date)),
    });
  });
  // Balance-history exports have one row per account per day: keep the latest.
  const byName = new Map<string, ImportedBalance>();
  let collapsed = 0;
  for (const r of rows) {
    const prev = byName.get(r.name);
    if (!prev) { byName.set(r.name, r); continue; }
    collapsed++;
    if ((r.asOf ?? '') >= (prev.asOf ?? '')) byName.set(r.name, r);
  }
  if (collapsed > 0) out.warnings.push(`This looks like a balance history; kept the latest balance for each of ${byName.size} accounts.`);
  out.balances = [...byName.values()];
}

/** Keeps only the latest balance on or before a date (e.g. the Hawl date). */
export function balancesAsOf(rows: ImportedBalance[], date: string): ImportedBalance[] {
  return rows.filter((r) => !r.asOf || r.asOf <= date);
}

function readZakatYears(t: Table, nf: NumberFormat, out: ParsedFile) {
  const c = {
    year: findColumn(t.headers, ALIASES.year),
    zakatDue: findColumn(t.headers, ALIASES.zakatDue),
    zakatPaid: findColumn(t.headers, ALIASES.zakatPaid),
    totalAssets: findColumn(t.headers, ALIASES.totalAssets),
    totalLiabilities: findColumn(t.headers, ALIASES.totalLiabilities),
    netZakatable: findColumn(t.headers, ALIASES.netZakatable),
    nisab: findColumn(t.headers, ALIASES.nisab),
    currency: findColumn(t.headers, ALIASES.currency),
    notes: findColumn(t.headers, ALIASES.notes),
  };
  t.rows.forEach((row, i) => {
    const line = t.headerRowIndex + i + 2;
    const yearRaw = cell(row, c.year);
    const year = yearRaw?.match(/\d{4}/)?.[0];
    if (!year) { out.skipped.push({ row: line, reason: 'No year' }); return; }
    const n = (k: keyof typeof c) => parseAmount(cell(row, c[k]), nf);
    out.zakatYears.push({
      year,
      zakatDue: n('zakatDue'),
      zakatPaid: n('zakatPaid'),
      totalAssets: n('totalAssets'),
      totalLiabilities: n('totalLiabilities'),
      netZakatable: n('netZakatable'),
      nisab: n('nisab'),
      currency: cell(row, c.currency)?.toUpperCase(),
      notes: cell(row, c.notes),
    });
  });
}

/** Accepts YYYY-MM-DD, YYYY/MM/DD and MM/DD/YYYY; returns YYYY-MM-DD or undefined. */
export function normalizeDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    // Ambiguous day/month: assume month first unless the first part can't be a month.
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [mm, dd] = a > 12 ? [b, a] : [a, b];
    return `${m[3]}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return undefined;
}
