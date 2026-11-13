// ─── Guessing what a named account or line item is ────────
//
// Turns "TD Chequing", "Questrade RRSP", "Visa Infinite" or "Wife's gold"
// into the ZakatFlow type it most likely is. Only a suggestion: the review
// screen shows it and the user can change it before anything is saved.

import type { AssetType, LiabilityType, RetirementAccountType } from '../types';

export type Classification =
  | { side: 'asset'; type: AssetType; retirementAccountType?: RetirementAccountType; confident: boolean }
  | { side: 'liability'; type: LiabilityType; confident: boolean };

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, words: string[]) =>
  words.some((w) => new RegExp(`(^|[^a-z0-9])${esc(w)}([^a-z0-9]|$)`).test(s));

export function classifyName(name: string, hint?: string): Classification {
  // "Credit union" is a bank, not credit; neutralise it before the credit checks.
  const s = `${name} ${hint ?? ''}`.toLowerCase().replace(/credit union/g, 'cu bank');

  // Liabilities first: "credit card" must not fall through to "card"/"bank".
  if (has(s, ['mortgage', 'heloc'])) return { side: 'liability', type: 'Mortgage', confident: true };
  if (has(s, ['student loan', 'osap', 'student'])) return { side: 'liability', type: 'Student_Loan', confident: true };
  if (has(s, ['credit card', 'visa', 'mastercard', 'amex', 'american express', 'credit'])) {
    return { side: 'liability', type: 'Credit_Balance', confident: true };
  }
  if (has(s, ['loan', 'line of credit', 'loc', 'car loan', 'auto loan'])) return { side: 'liability', type: 'Personal_Loan', confident: true };
  if (has(s, ['mahr', 'dowry'])) return { side: 'liability', type: 'Dowry', confident: true };
  if (has(s, ['bill', 'bills', 'utility', 'utilities'])) return { side: 'liability', type: 'Utility_Bills', confident: false };

  // Retirement and tax-sheltered accounts.
  if (has(s, ['401k', '401(k)', '403b', 'traditional ira', 'ira', 'rrsp', 'lira', 'rrif', 'sipp', 'pension'])) {
    const rt: RetirementAccountType = has(s, ['rrsp', 'lira', 'rrif']) ? 'Taxable_RRSP' : 'Taxable_401k';
    return { side: 'asset', type: 'Retirement', retirementAccountType: rt, confident: true };
  }
  if (has(s, ['roth'])) return { side: 'asset', type: 'Retirement', retirementAccountType: 'NonTaxable_Roth', confident: true };
  if (has(s, ['tfsa', 'isa', 'fhsa', 'resp'])) {
    return { side: 'asset', type: 'Retirement', retirementAccountType: 'NonTaxable_TFSA', confident: false };
  }

  if (has(s, ['gold', 'xau'])) return { side: 'asset', type: 'Gold', confident: true };
  if (has(s, ['silver', 'xag'])) return { side: 'asset', type: 'Silver', confident: true };
  if (has(s, ['bitcoin', 'btc', 'eth', 'ethereum', 'crypto', 'coinbase', 'kraken', 'binance', 'shakepay', 'wallet'])) {
    return { side: 'asset', type: 'Crypto', confident: true };
  }
  if (has(s, ['brokerage', 'investment', 'investing', 'stocks', 'shares', 'etf', 'margin', 'trading', 'portfolio', 'non-registered', 'taxable'])) {
    return { side: 'asset', type: 'Stock', confident: false };
  }
  if (has(s, ['inventory', 'merchandise', 'stock in trade'])) return { side: 'asset', type: 'Merchandise', confident: true };
  if (has(s, ['owed to me', 'receivable', 'lent', 'loan to'])) return { side: 'asset', type: 'Debt_Receivable', confident: true };
  if (has(s, ['cash', 'wallet cash', 'on hand'])) return { side: 'asset', type: 'Cash', confident: true };
  if (has(s, ['chequing', 'checking', 'savings', 'saving', 'current account', 'deposit', 'hisa', 'bank', 'gic', 'cd', 'money market'])) {
    return { side: 'asset', type: 'Bank', confident: true };
  }
  return { side: 'asset', type: 'Bank', confident: false };
}
