import { describe, it, expect } from 'vitest';
import { buildSummary, changeKey } from './store';
import { DEFAULT_SETTINGS, type Asset, type PriceData } from './types';

const prices: PriceData = { goldPerGram: 100, silverPerGram: 1, exchangeRates: { USD: 1 }, lastUpdated: '' };

const cash = (year: string, value: number): Asset => ({
    id: `${year}-${value}`, zakatYear: year, type: 'Cash', name: 'cash', currency: 'USD', grossValue: value,
    zakatMethod: 'Market', valuationPercent: 100, deductibleTaxPenalty: 0, netZakatableValue: 0,
});

describe('changeKey', () => {
    it('gives later edits to the same record the same key so they replace earlier ones', () => {
        const a = cash('2026', 1);
        expect(changeKey({ entity: 'assets', action: 'upsert', record: a })).toBe(`assets:${a.id}`);
        expect(changeKey({ entity: 'assets', action: 'delete', key: a.id })).toBe(`assets:${a.id}`);
        expect(changeKey({ entity: 'settings', action: 'upsert', record: DEFAULT_SETTINGS })).toBe('settings');
    });
});

describe('buildSummary', () => {
    it('calculates open years and uses the recorded figures for finalized years', () => {
        const summary = buildSummary({
            settings: DEFAULT_SETTINGS,
            prices,
            assets: [cash('2026', 20000), cash('2025', 99999)],
            liabilities: [],
            donations: [],
            history: [{
                year: '2025', dateFinalized: '2025-05-01', totalAssets: 10000, totalLiabilities: 0,
                netZakatable: 10000, nisabThresholdUsed: 5000, zakatPaid: 250, recipientsList: '',
            }],
        });
        const y2026 = summary.years.find((y) => y.year === '2026')!;
        const y2025 = summary.years.find((y) => y.year === '2025')!;
        expect(y2026.zakatDue).toBeCloseTo(500);
        expect(y2025.zakatDue).toBe(250);
        expect(y2025.totalAssets).toBe(10000);
    });
});

describe('buildSummary with interest', () => {
    it('deducts interest earned through the year and not yet given away', () => {
        const summary = buildSummary({
            settings: DEFAULT_SETTINGS,
            prices,
            assets: [cash('2026', 20000)],
            liabilities: [],
            history: [],
            donations: [
                // $200 of the interest already given away; Zakat paid does not change the base
                { id: 'g', zakatYear: '2026', date: '2026-02-01', amount: 200, recipient: 'Hospital', notes: '', category: 'Interest' },
                { id: 'z', zakatYear: '2026', date: '2026-03-01', amount: 100, recipient: 'Masjid', notes: '', category: 'Zakat' },
            ],
            interest: [
                { id: 'i1', zakatYear: '2026', date: '2026-01-31', accountName: 'Savings', currency: 'USD', amount: 1000, period: 'year', notes: '' },
                // Earned after this Zakat year: not deducted from 2026
                { id: 'i2', zakatYear: '2027', date: '2027-01-31', accountName: 'Savings', currency: 'USD', amount: 5000, period: 'year', notes: '' },
            ],
        });
        const y = summary.years.find((r) => r.year === '2026')!;
        expect(y.netZakatable).toBe(19200); // 20,000 − (1,000 − 200)
        expect(y.zakatDue).toBeCloseTo(480);
    });
});
