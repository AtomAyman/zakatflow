// ─── Review drafts ────────────────────────────────────────
//
// Everything read from a file or screenshot becomes a DraftRow first. The
// review screen shows them, lets the user change the type, value or year,
// and untick anything. Only ticked rows become Assets, Liabilities or History
// entries in the user's Sheet. Rows that already exist are found and left
// unticked, so importing the same file twice does not double anything.

import { v4 as uuid } from 'uuid';
import type { Asset, AssetType, HistoryEntry, Liability, LiabilityType, RetirementAccountType } from '../types';
import { classifyName } from './classify';
import type { ImportedBalance, ImportedZakatYear, ParsedFile } from './parse';
import type { ImportedHolding } from './types';

interface DraftBase {
  key: string;
  include: boolean;
  /** Shown in the review table. */
  label: string;
  /** Set when a matching record is already in the Sheet. */
  duplicateOf?: string;
  notes: string[];
}

export interface AssetDraft extends DraftBase {
  target: 'asset';
  type: AssetType;
  value: number;
  currency: string;
  ticker?: string;
  quantity?: number;
  retirementAccountType?: RetirementAccountType;
  /** False when the type was a guess the user should check. */
  confident: boolean;
}

export interface LiabilityDraft extends DraftBase {
  target: 'liability';
  type: LiabilityType;
  value: number;
  currency: string;
  confident: boolean;
}

export interface HistoryDraft extends DraftBase {
  target: 'history';
  year: string;
  zakatDue?: number;
  zakatPaid?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  netZakatable?: number;
  nisab?: number;
}

export type DraftRow = AssetDraft | LiabilityDraft | HistoryDraft;

export interface DraftContext {
  zakatYear: string;
  baseCurrency: string;
  existingAssets: Asset[];
  existingLiabilities: Liability[];
  existingHistory: HistoryEntry[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005);

export function draftsFromParsed(p: ParsedFile, ctx: DraftContext): DraftRow[] {
  if (p.kind === 'holdings') return p.holdings.map((h) => holdingDraft(h, ctx));
  if (p.kind === 'balances') return p.balances.map((b) => balanceDraft(b, ctx));
  return p.zakatYears.map((y) => historyDraft(y, ctx));
}

export function holdingDraft(h: ImportedHolding, ctx: DraftContext): AssetDraft {
  const notes: string[] = [];
  if (h.marketValue == null) notes.push('No value in the file; enter it before adding.');
  const acct = h.accountName ? classifyName(h.accountName) : null;
  if (acct?.side === 'asset' && acct.type === 'Retirement') {
    notes.push('Held in a retirement account. You can add the whole account as Retirement instead.');
  }
  const label = h.name ? `${h.symbol} · ${h.name}` : h.symbol;
  const dup = ctx.existingAssets.find((a) =>
    a.zakatYear === ctx.zakatYear && a.type === 'Stock' &&
    ((a.ticker && norm(a.ticker) === norm(h.symbol)) || norm(a.name) === norm(label)) &&
    (h.quantity == null || a.quantity == null || close(a.quantity, h.quantity)));
  return {
    key: uuid(), target: 'asset', include: !dup, label, notes,
    duplicateOf: dup?.name,
    type: 'Stock', value: h.marketValue ?? 0, currency: h.currency || ctx.baseCurrency,
    ticker: h.symbol, quantity: h.quantity, confident: true,
  };
}

export function balanceDraft(b: ImportedBalance, ctx: DraftContext): AssetDraft | LiabilityDraft {
  const c = classifyName(b.name, b.typeHint);
  const notes: string[] = [];
  if (!c.confident) notes.push('Type is a guess; please check it.');
  if (b.asOf) notes.push(`Balance as of ${b.asOf}.`);
  const currency = b.currency || ctx.baseCurrency;
  // Debts often come through as negative balances; store them as positive amounts.
  const value = Math.abs(b.value);
  if (c.side === 'liability' || (b.value < 0 && c.side === 'asset' && !c.confident)) {
    const type: LiabilityType = c.side === 'liability' ? c.type : 'Other';
    if (!['Credit_Balance', 'Utility_Bills', 'Medical_Bills'].includes(type)) {
      notes.push('Only the payments due this year are deducted; add the monthly payment after importing.');
    }
    const dup = ctx.existingLiabilities.find((l) =>
      l.zakatYear === ctx.zakatYear && norm(l.name) === norm(b.name) && close(l.totalAmount, value));
    return {
      key: uuid(), target: 'liability', include: !dup, label: b.name, notes,
      duplicateOf: dup?.name, type, value, currency, confident: c.confident,
    };
  }
  const dup = ctx.existingAssets.find((a) =>
    a.zakatYear === ctx.zakatYear && norm(a.name) === norm(b.name) && close(a.grossValue, value));
  return {
    key: uuid(), target: 'asset', include: !dup, label: b.name, notes,
    duplicateOf: dup?.name, type: c.type, value, currency,
    retirementAccountType: c.retirementAccountType, confident: c.confident,
  };
}

export function historyDraft(y: ImportedZakatYear, ctx: DraftContext): HistoryDraft {
  const dup = ctx.existingHistory.find((h) => h.year === y.year);
  const notes: string[] = [];
  if (y.zakatDue == null && y.zakatPaid == null) notes.push('No Zakat amount found for this year.');
  if (y.currency && y.currency !== ctx.baseCurrency) notes.push(`Amounts are in ${y.currency}; History stores them as given.`);
  if (dup) notes.push('This year is already in your History.');
  return {
    key: uuid(), target: 'history', include: !dup, label: `Zakat ${y.year}`, notes,
    duplicateOf: dup ? `History ${dup.year}` : undefined,
    year: y.year, zakatDue: y.zakatDue, zakatPaid: y.zakatPaid, totalAssets: y.totalAssets,
    totalLiabilities: y.totalLiabilities, netZakatable: y.netZakatable, nisab: y.nisab,
  };
}

// ─── Draft → records ──────────────────────────────────────

export function draftToAsset(d: AssetDraft, zakatYear: string): Asset {
  const base: Asset = {
    id: uuid(),
    zakatYear,
    type: d.type,
    name: d.label,
    currency: d.currency,
    grossValue: d.value,
    zakatMethod: 'Market',
    valuationPercent: 100,
    deductibleTaxPenalty: 0,
    netZakatableValue: 0,
  };
  if (d.type === 'Stock') {
    // Long-term holding with the 30% proxy until the filings lookup is wired in;
    // the user can switch method on the Assets page.
    return {
      ...base, ticker: d.ticker, quantity: d.quantity, stockHoldingType: 'Long_Term',
      zakatMethod: 'Passive_Proxy', valuationPercent: 30, zakatableAssetPercent: 30,
    };
  }
  if (d.type === 'Retirement') {
    return {
      ...base, retirementType: 'Voluntary',
      retirementAccountType: d.retirementAccountType ?? 'Taxable_401k', zakatableAssetPercent: 40,
    };
  }
  if (d.type === 'Gold' || d.type === 'Silver') return { ...base, isETF: true };
  if (d.type === 'Crypto') return { ...base, cryptoIntent: 'Currency' };
  if (d.type === 'Debt_Receivable') return { ...base, debtStrength: 'Strong' };
  return base;
}

export function draftToLiability(d: LiabilityDraft, zakatYear: string): Liability {
  return {
    id: uuid(), zakatYear, type: d.type, name: d.label, currency: d.currency,
    totalAmount: d.value, monthlyPayment: 0, isImmediate: d.type === 'Credit_Balance' || d.type === 'Utility_Bills',
  };
}

export function draftToHistory(d: HistoryDraft): HistoryEntry {
  return {
    year: d.year,
    dateFinalized: new Date().toISOString().split('T')[0],
    totalAssets: d.totalAssets ?? 0,
    totalLiabilities: d.totalLiabilities ?? 0,
    netZakatable: d.netZakatable ?? Math.max(0, (d.totalAssets ?? 0) - (d.totalLiabilities ?? 0)),
    nisabThresholdUsed: d.nisab ?? 0,
    zakatPaid: d.zakatPaid ?? d.zakatDue ?? 0,
    recipientsList: 'Imported',
  };
}
