import { describe, it, expect } from 'vitest';
import {
    calculateAssetNetValue,
    calculateDashboard,
    calculateLiabilityDeduction,
    calculateNisab,
    getZakatRate,
} from './zakat-engine';
import type { Asset, Liability, PriceData, Settings } from './types';

const prices: PriceData = {
    goldPerGram: 100,
    silverPerGram: 1,
    exchangeRates: { USD: 1, CAD: 0.75, GBP: 1.25 },
    lastUpdated: '',
};

const hanafi: Settings = {
    madhab: 'Hanafi',
    nisabStandard: 'Gold',
    calculationBasis: 'Hijri',
    baseCurrency: 'USD',
    isUnderRetirementAge: true,
};

const shafi: Settings = { ...hanafi, madhab: 'Shafi' };

let nextId = 0;
function asset(overrides: Partial<Asset>): Asset {
    return {
        id: `a${nextId++}`,
        zakatYear: '2026',
        type: 'Cash',
        name: 'test',
        currency: 'USD',
        grossValue: 0,
        zakatMethod: 'Market',
        valuationPercent: 100,
        deductibleTaxPenalty: 0,
        netZakatableValue: 0,
        ...overrides,
    };
}

function liability(overrides: Partial<Liability>): Liability {
    return {
        id: `l${nextId++}`,
        zakatYear: '2026',
        type: 'Other',
        name: 'test',
        currency: 'USD',
        totalAmount: 0,
        monthlyPayment: 0,
        ...overrides,
    };
}

const net = (a: Asset, s: Settings = hanafi) =>
    calculateAssetNetValue(a, s, prices.exchangeRates, prices).netZakatable;

describe('getZakatRate', () => {
    it('uses 2.5% for the lunar year and 2.577% for the solar year', () => {
        expect(getZakatRate('Hijri')).toBe(0.025);
        expect(getZakatRate('Gregorian')).toBe(0.02577);
    });
});

describe('calculateNisab', () => {
    it('uses 87.48g of gold', () => {
        expect(calculateNisab('Gold', prices, 'USD')).toBeCloseTo(8748);
    });

    it('uses 612.36g of silver', () => {
        expect(calculateNisab('Silver', prices, 'USD')).toBeCloseTo(612.36);
    });

    it('converts into the base currency', () => {
        // 8748 USD / 0.75 USD-per-CAD
        expect(calculateNisab('Gold', prices, 'CAD')).toBeCloseTo(11664);
    });
});

describe('calculateAssetNetValue', () => {
    it('counts cash in full and converts currency', () => {
        expect(net(asset({ grossValue: 1000 }))).toBe(1000);
        expect(net(asset({ grossValue: 1000, currency: 'GBP' }))).toBeCloseTo(1250);
    });

    it('values gold by weight and purity from the live price', () => {
        // 10g of 18K gold = 10 * 100 * 0.75
        expect(net(asset({ type: 'Gold', weightGrams: 10, goldPurity: 18 }))).toBeCloseTo(750);
    });

    it('uses the dollar value for gold ETFs instead of weight', () => {
        expect(net(asset({ type: 'Gold', isETF: true, grossValue: 500, weightGrams: 10 }))).toBe(500);
    });

    it('makes jewelry zakatable for Hanafi but exempt for other madhabs', () => {
        const ring = asset({ type: 'Gold', weightGrams: 10, goldPurity: 24, isJewelry: true });
        expect(net(ring, hanafi)).toBeCloseTo(1000);
        expect(net(ring, shafi)).toBe(0);
    });

    it('counts short-term stocks in full', () => {
        expect(net(asset({ type: 'Stock', stockHoldingType: 'Short_Term', grossValue: 1000 }))).toBe(1000);
    });

    it('applies the 30% proxy to long-term passive stocks', () => {
        expect(
            net(asset({ type: 'Stock', stockHoldingType: 'Long_Term', zakatMethod: 'Passive_Proxy', grossValue: 1000 }))
        ).toBeCloseTo(300);
    });

    it('counts commodity ETFs in full', () => {
        expect(
            net(asset({ type: 'Stock', stockHoldingType: 'Long_Term', zakatMethod: 'Commodity_ETF', grossValue: 1000 }))
        ).toBe(1000);
    });

    it('uses the manual percentage for long-term stocks', () => {
        expect(
            net(asset({ type: 'Stock', stockHoldingType: 'Long_Term', zakatMethod: 'Manual', zakatableAssetPercent: 25, grossValue: 1000 }))
        ).toBeCloseTo(250);
    });

    it('excludes platform tokens but counts currency crypto', () => {
        expect(net(asset({ type: 'Crypto', cryptoIntent: 'Platform_Token', grossValue: 1000 }))).toBe(0);
        expect(net(asset({ type: 'Crypto', cryptoIntent: 'Currency', grossValue: 1000 }))).toBe(1000);
    });

    it('counts only strong receivable debts', () => {
        expect(net(asset({ type: 'Debt_Receivable', debtStrength: 'Strong', grossValue: 1000 }))).toBe(1000);
        expect(net(asset({ type: 'Debt_Receivable', debtStrength: 'Weak', grossValue: 1000 }))).toBe(0);
    });

    it('excludes mandatory retirement plans', () => {
        expect(net(asset({ type: 'Retirement', retirementType: 'Mandatory', grossValue: 1000 }))).toBe(0);
    });

    it('applies the zakatable percentage to non-taxable retirement accounts', () => {
        expect(
            net(asset({
                type: 'Retirement',
                retirementType: 'Voluntary',
                retirementAccountType: 'NonTaxable_Roth',
                zakatableAssetPercent: 40,
                grossValue: 1000,
            }))
        ).toBeCloseTo(400);
    });

    it('deducts tax and the early-withdrawal penalty from taxable retirement accounts', () => {
        // income 75k → 22% federal; TX → 0% state; under retirement age → 10% penalty
        const settings: Settings = { ...hanafi, incomeLevel: 75000, stateProvince: 'TX' };
        const value = net(
            asset({
                type: 'Retirement',
                retirementType: 'Voluntary',
                retirementAccountType: 'Taxable_401k',
                zakatableAssetPercent: 100,
                grossValue: 1000,
            }),
            settings
        );
        expect(value).toBeCloseTo(680);
    });

    it('applies the valuation percent to merchandise', () => {
        expect(net(asset({ type: 'Merchandise', valuationPercent: 80, grossValue: 1000 }))).toBeCloseTo(800);
    });
});

describe('calculateLiabilityDeduction', () => {
    const debts = [
        liability({ totalAmount: 200000, monthlyPayment: 1000 }), // mortgage-style
        liability({ totalAmount: 500, isImmediate: true }),       // bill due now
    ];

    it('Hanafi deducts 12 months of long-term payments plus immediate debts', () => {
        expect(calculateLiabilityDeduction(debts, 'Hanafi', 'USD', prices.exchangeRates)).toBe(12500);
    });

    it('other madhabs deduct only immediate debts', () => {
        expect(calculateLiabilityDeduction(debts, 'Shafi', 'USD', prices.exchangeRates)).toBe(500);
    });
});

describe('calculateDashboard', () => {
    it('charges 2.5% when above nisab', () => {
        const result = calculateDashboard(
            [asset({ grossValue: 20000 })],
            [liability({ totalAmount: 1000, isImmediate: true })],
            hanafi,
            prices
        );
        expect(result.netZakatableWealth).toBe(19000);
        expect(result.isAboveNisab).toBe(true);
        expect(result.zakatDue).toBeCloseTo(475);
    });

    it('charges nothing below nisab', () => {
        const result = calculateDashboard([asset({ grossValue: 5000 })], [], hanafi, prices);
        expect(result.isAboveNisab).toBe(false);
        expect(result.zakatDue).toBe(0);
    });

    it('deducts interest still to be given away: it is not the owner\'s wealth', () => {
        const result = calculateDashboard([asset({ grossValue: 20000 })], [], hanafi, prices, 1000);
        expect(result.interestToGiveAway).toBe(1000);
        expect(result.netZakatableWealth).toBe(19000);
        expect(result.zakatDue).toBeCloseTo(475);
    });

    it('interest still held can take wealth below nisab (gold nisab here: 85 g x 100 = 8,500)', () => {
        expect(calculateDashboard([asset({ grossValue: 9000 })], [], hanafi, prices).zakatDue).toBeCloseTo(225);
        const withInterest = calculateDashboard([asset({ grossValue: 9000 })], [], hanafi, prices, 600);
        expect(withInterest.netZakatableWealth).toBe(8400);
        expect(withInterest.isAboveNisab).toBe(false);
        expect(withInterest.zakatDue).toBe(0);
    });

    it('never lets debts push wealth below zero', () => {
        const result = calculateDashboard(
            [asset({ grossValue: 100 })],
            [liability({ totalAmount: 1000, isImmediate: true })],
            hanafi,
            prices
        );
        expect(result.netZakatableWealth).toBe(0);
    });
});
