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
