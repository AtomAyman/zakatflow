import { describe, expect, it } from 'vitest';
import type { Asset } from '../types';
import { classifyName } from './classify';
import { draftsFromParsed, draftToAsset, draftToHistory, draftToLiability, type DraftContext } from './draft';
import { parseImportFile, type ParsedFile } from './parse';
import { parseStatementText } from './statement-text';
import { detectNumberFormat, parseAmount, sniffDelimiter } from './table';

const ctx: DraftContext = { zakatYear: '2026', baseCurrency: 'CAD', existingAssets: [], existingLiabilities: [], existingHistory: [] };
const ok = (r: ParsedFile | { error: string }): ParsedFile => {
  if ('error' in r) throw new Error(r.error);
  return r;
};

describe('numbers and delimiters', () => {
  it('reads common formats', () => {
    expect(parseAmount('$1,820.40')).toBe(1820.4);
    expect(parseAmount('(15.00)')).toBe(-15);
    expect(parseAmount('-£2,000')).toBe(-2000);
    expect(parseAmount('1.234,56', '1.234,56')).toBe(1234.56);
    expect(parseAmount('1 234,56', '1 234,56')).toBe(1234.56);
    expect(parseAmount('--')).toBeUndefined();
  });
  it('detects European numbers and semicolons', () => {
    expect(detectNumberFormat(['1.234,56', '12,5', '3.000,00'])).toBe('1.234,56');
    expect(sniffDelimiter('a;b;c\n1;2;3\n')).toBe(';');
  });
});

describe('holdings files', () => {
  it('finds the header under a title line and computes values from price', () => {
    const csv = 'Holdings report,RRSP\n\nSymbol,Name,Exchange,Quantity,Price,Currency\nVFV,Vanguard S&P 500,TSX,12.5,145.6,CAD\nCash,,,,,\nAAPL,Apple,NASDAQ,3,"$210.00",USD\n';
    const p = ok(parseImportFile(csv));
    expect(p.kind).toBe('holdings');
    expect(p.holdings).toHaveLength(2);
    expect(p.holdings[0]).toMatchObject({ symbol: 'VFV', exchange: 'TSX', quantity: 12.5, marketValue: 1820, currency: 'CAD' });
    expect(p.skipped[0].reason).toMatch(/Cash/);
  });
  it('reads a semicolon file with European numbers', () => {
    const csv = 'Ticker;Stück;Kurswert;Währung\nSAP;10;1.523,40;EUR\n';
    const p = ok(parseImportFile(csv.replace('Stück', 'Shares').replace('Kurswert', 'Market value').replace('Währung', 'Currency')));
    expect(p.holdings[0]).toMatchObject({ symbol: 'SAP', quantity: 10, marketValue: 1523.4, currency: 'EUR' });
  });
  it('marks a holding already in the Sheet as a duplicate', () => {
    const existing = { id: '1', zakatYear: '2026', type: 'Stock', name: 'AAPL', ticker: 'AAPL', quantity: 3 } as Asset;
    const p = ok(parseImportFile('Symbol,Quantity,Market Value\nAAPL,3,630\nMSFT,1,400\n'));
    const drafts = draftsFromParsed(p, { ...ctx, existingAssets: [existing] });
    expect(drafts.map((d) => d.include)).toEqual([false, true]);
    expect(drafts[0].duplicateOf).toBe('AAPL');
  });
});

describe('balances files', () => {
  it('keeps the latest balance per account from a balance history', () => {
    const csv = 'Date,Account,Balance\n2026-01-01,TD Chequing,1000\n2026-03-01,TD Chequing,1500\n2026-03-01,Visa Infinite,-420.10\n';
    const p = ok(parseImportFile(csv));
    expect(p.kind).toBe('balances');
    expect(p.balances.find((b) => b.name === 'TD Chequing')?.value).toBe(1500);
    expect(p.warnings.join(' ')).toMatch(/balance history/);
  });
  it('sorts an old manual Zakat sheet into assets and liabilities', () => {
    const csv = 'Item,Amount\nSavings account,12000\nWife gold jewellery,8000\nQuestrade RRSP,30000\nCar loan,5000\nTotal,45000\n';
    const p = ok(parseImportFile(csv));
    const drafts = draftsFromParsed(p, ctx);
    expect(drafts.map((d) => [d.target, d.target !== 'history' ? d.type : ''])).toEqual([
      ['asset', 'Bank'], ['asset', 'Gold'], ['asset', 'Retirement'], ['liability', 'Personal_Loan'],
    ]);
    const rrsp = draftToAsset(drafts[2] as never, '2026');
    expect(rrsp.retirementAccountType).toBe('Taxable_RRSP');
    const loan = draftToLiability(drafts[3] as never, '2026');
    expect(loan.totalAmount).toBe(5000);
  });
  it('classifies tricky names', () => {
    expect(classifyName('Credit union chequing').side).toBe('asset');
    expect(classifyName('Amex Gold').side).toBe('liability');
    expect(classifyName('Fidelity 401(k)')).toMatchObject({ type: 'Retirement', retirementAccountType: 'Taxable_401k' });
    expect(classifyName('Stocks & Shares ISA')).toMatchObject({ type: 'Retirement', retirementAccountType: 'NonTaxable_TFSA' });
  });
});

describe('past Zakat years', () => {
  it('reads a yearly summary and maps it to History', () => {
    const csv = 'Year,Total assets,Nisab,Zakat due,Zakat paid\n2024,90000,7500,2100,2100\n2025 (1446),101000,8000,2400,2000\n';
    const p = ok(parseImportFile(csv));
    expect(p.kind).toBe('zakat_years');
    const drafts = draftsFromParsed(p, { ...ctx, existingHistory: [{ year: '2024' } as never] });
    expect(drafts.map((d) => d.include)).toEqual([false, true]);
    const h = draftToHistory(drafts[1] as never);
    expect(h).toMatchObject({ year: '2025', totalAssets: 101000, nisabThresholdUsed: 8000, zakatPaid: 2000 });
  });
});

describe('screenshot text', () => {
  it('turns OCR lines into balances and holdings', () => {
    const text = 'Accounts\nTD Chequing $4,210.55\nTFSA - Wealthsimple CA$18,902.10\nVFV 12 shares $1,820.40\nVisa Infinite -$420.10\nTotal $24,513.00\nUpdated 2 min ago\n';
    const s = parseStatementText(text);
    expect(s.balances.map((b) => [b.name, b.value])).toEqual([
      ['TD Chequing', 4210.55], ['TFSA - Wealthsimple', 18902.1], ['Visa Infinite', -420.1],
    ]);
    expect(s.balances[1].currency).toBe('CAD');
    expect(s.holdings[0]).toMatchObject({ symbol: 'VFV', quantity: 12, marketValue: 1820.4 });
  });
});
