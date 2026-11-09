import { describe, expect, it } from 'vitest';
import { accountZakat } from './account-zakat';
import { incomeTax, incrementalTax } from './tax-tables';
import { estimatePortfolio, estimateWithdrawal, ukPensionAccessAge, type AccountInput, type TaxProfile } from './withdrawal';

const rates = { USD: 1, CAD: 0.73, GBP: 1.3 };
const AS_OF = '2026-11-09';

const ontario: TaxProfile = { residence: { country: 'CA', region: 'ON' }, usPerson: false, age: 40, annualIncome: 90_000 };
const texas: TaxProfile = { residence: { country: 'US', region: 'TX', filingStatus: 'single' }, usPerson: false, age: 40, annualIncome: 90_000 };

const line = (e: ReturnType<typeof estimateWithdrawal>, key: string) => e.lines.find((l) => l.key === key)?.amount ?? 0;

describe('tax tables', () => {
    it('US federal 2026 single: worked by hand', () => {
        // $90k income → $73,900 taxable: 12,400×10% + 38,000×12% + 23,500×22%
        expect(incomeTax(90_000, { country: 'US', filingStatus: 'single' }).tax).toBeCloseTo(1_240 + 4_560 + 5_170, 6);
    });

    it('incremental tax spans brackets instead of using one marginal rate', () => {
        // $90k → $190k single: 31,800 at 22% + 68,200 at 24%
        expect(incrementalTax(90_000, 100_000, { country: 'US', filingStatus: 'single' }).tax).toBeCloseTo(6_996 + 16_368, 6);
    });

    it('UK: personal allowance is withdrawn above £100k', () => {
        expect(incomeTax(12_570, { country: 'UK' }).tax).toBe(0);
        expect(incomeTax(50_270, { country: 'UK' }).tax).toBeCloseTo(7_540, 6);
        // At £125,140 the allowance is fully gone: 37,700×20% + 87,440×40%
        expect(incomeTax(125_140, { country: 'UK' }).tax).toBeCloseTo(7_540 + 34_976, 6);
    });

    it('provinces without a bracket table are approximate', () => {
        expect(incomeTax(80_000, { country: 'CA', region: 'NS' }).approximate).toBe(true);
        expect(incomeTax(80_000, { country: 'CA', region: 'ON' }).approximate).toBe(false);
    });
});

describe('the user’s example: $100k 401(k), age 40', () => {
    const holdings = [
        { name: 'NVDA', value: 20_000, zakatablePercent: 47.2 },
        { name: 'AAPL', value: 30_000, zakatablePercent: 38.3 },
        { name: 'MU', value: 10_000, zakatablePercent: 30 },
        { name: 'Gold ETF', value: 20_000, zakatablePercent: 100 },
        { name: 'Cash', value: 20_000, zakatablePercent: 100 },
    ];

    it('Canadian resident (not a US person): 30% US withholding + 10% penalty + extra Canadian tax', () => {
        const e = estimateWithdrawal({ type: 'US_401K', balance: 100_000 }, ontario, rates, AS_OF);
        expect(line(e, 'penalty')).toBe(10_000);
        expect(line(e, 'source_tax')).toBe(30_000);
        expect(line(e, 'residence_tax')).toBeGreaterThan(0);
        expect(e.net).toBeGreaterThan(50_000);
        expect(e.net).toBeLessThan(56_000);
        expect(e.approximate).toBe(true);

        const z = accountZakat(e, holdings);
        // Each holding is scaled to its in-hand share before its own Zakatable % applies.
        const nvda = z.rows[0];
        expect(nvda.inHandValue).toBeCloseTo(20_000 * e.netFraction, 6);
        expect(nvda.zakat).toBeCloseTo(20_000 * e.netFraction * 0.472 * 0.025, 6);
        expect(z.totals.zakat).toBeCloseTo(
            holdings.reduce((s, h) => s + h.value * e.netFraction * (h.zakatablePercent / 100) * 0.025, 0),
            6
        );
    });

    it('US resident: domestic incremental tax + 10%', () => {
        const e = estimateWithdrawal({ type: 'US_401K', balance: 100_000 }, texas, rates, AS_OF);
        expect(e.lines.map((l) => l.key)).toEqual(['penalty', 'domestic_tax']);
        expect(line(e, 'domestic_tax')).toBeCloseTo(23_364, 6);
        expect(e.net).toBeCloseTo(66_636, 6);
    });

    it('US citizen living in Canada: no non-resident withholding; pays the higher of US or Canadian tax', () => {
        const e = estimateWithdrawal({ type: 'US_401K', balance: 100_000 }, { ...ontario, usPerson: true }, rates, AS_OF);
        expect(line(e, 'source_tax')).toBe(0);
        expect(line(e, 'penalty')).toBe(10_000);
        const nonCitizen = estimateWithdrawal({ type: 'US_401K', balance: 100_000 }, ontario, rates, AS_OF);
        // With credits, total income tax is the same: the higher of the two countries.
        expect(e.net).toBeCloseTo(nonCitizen.net, 6);
    });

    it('past 59½: no penalty', () => {
        const e = estimateWithdrawal({ type: 'US_401K', balance: 100_000 }, { ...texas, age: 60 }, rates, AS_OF);
        expect(line(e, 'penalty')).toBe(0);
    });

    it('rule of 55 removes the penalty for a 401(k) after separation', () => {
        const e = estimateWithdrawal({ type: 'US_401K', balance: 100_000, separatedAtOrAfter55: true }, { ...texas, age: 56 }, rates, AS_OF);
        expect(line(e, 'penalty')).toBe(0);
    });

    it('unvested employer money is excluded entirely', () => {
        const e = estimateWithdrawal({ type: 'US_401K', balance: 100_000, unvested: 10_000 }, { ...texas, age: 60 }, rates, AS_OF);
        expect(line(e, 'unvested')).toBe(10_000);
        expect(e.net).toBeCloseTo(90_000 - line(e, 'domestic_tax'), 6);
    });
});

describe('other account types', () => {
    it('Roth IRA: contributions come out free, earnings taxed and penalised', () => {
        const e = estimateWithdrawal({ type: 'US_ROTH_IRA', balance: 50_000, contributions: 40_000 }, texas, rates, AS_OF);
        expect(line(e, 'penalty')).toBe(1_000);
        expect(e.net).toBeGreaterThan(46_000);
    });

    it('457(b): no early-withdrawal penalty', () => {
        const e = estimateWithdrawal({ type: 'US_457B', balance: 50_000 }, texas, rates, AS_OF);
        expect(line(e, 'penalty')).toBe(0);
    });

    it('SIMPLE IRA in its first two years: 25%', () => {
        const e = estimateWithdrawal({ type: 'US_SIMPLE_IRA', balance: 10_000, simpleIraFirstTwoYears: true }, texas, rates, AS_OF);
        expect(line(e, 'penalty')).toBe(2_500);
    });

    it('HSA: 20% before 65 unless for medical use', () => {
        expect(line(estimateWithdrawal({ type: 'US_HSA', balance: 10_000 }, texas, rates, AS_OF), 'penalty')).toBe(2_000);
        expect(estimateWithdrawal({ type: 'US_HSA', balance: 10_000, qualifyingUse: true }, texas, rates, AS_OF).net).toBe(10_000);
    });

    it('TFSA, ISA and brokerage accounts cost nothing to withdraw', () => {
        for (const type of ['CA_TFSA', 'UK_ISA', 'US_BROKERAGE'] as const) {
            expect(estimateWithdrawal({ type, balance: 10_000 }, ontario, rates, AS_OF).netFraction).toBe(1);
        }
    });

    it('RRSP for an Ontario resident: incremental income tax only, no double-counted withholding', () => {
        const e = estimateWithdrawal({ type: 'CA_RRSP', balance: 100_000 }, ontario, rates, AS_OF);
        expect(e.lines.map((l) => l.key)).toEqual(['domestic_tax']);
        expect(line(e, 'domestic_tax')).toBeCloseTo(incrementalTax(90_000, 100_000, ontario.residence).tax, 6);
    });

    it('RRSP for a US resident: 25% Canadian non-resident tax, then US tax after credit', () => {
        const e = estimateWithdrawal({ type: 'CA_RRSP', balance: 100_000 }, texas, rates, AS_OF);
        expect(line(e, 'source_tax')).toBe(25_000);
        expect(e.currency).toBe('CAD');
    });

    it('RESP: grants repaid, growth taxed + 20%, contributions free', () => {
        const e = estimateWithdrawal({ type: 'CA_RESP', balance: 30_000, contributions: 20_000, grantsToRepay: 4_000 }, ontario, rates, AS_OF);
        expect(line(e, 'grant_repayment')).toBe(4_000);
        expect(line(e, 'charge')).toBe(1_200); // 20% of $6,000 growth
    });

    it('Lifetime ISA: 25% charge unless for a first home or age 60+', () => {
        const uk: TaxProfile = { residence: { country: 'UK' }, usPerson: false, age: 35, annualIncome: 40_000 };
        expect(line(estimateWithdrawal({ type: 'UK_LIFETIME_ISA', balance: 8_000 }, uk, rates, AS_OF), 'charge')).toBe(2_000);
        expect(estimateWithdrawal({ type: 'UK_LIFETIME_ISA', balance: 8_000, qualifyingUse: true }, uk, rates, AS_OF).net).toBe(8_000);
    });

    it('locked accounts: LIRA, and UK pensions before 55 (57 from April 2028)', () => {
        expect(estimateWithdrawal({ type: 'CA_LIRA', balance: 10_000 }, ontario, rates, AS_OF).locked).toBe(true);
        const uk: TaxProfile = { residence: { country: 'UK' }, usPerson: false, age: 56, annualIncome: 40_000 };
        expect(estimateWithdrawal({ type: 'UK_SIPP', balance: 10_000 }, uk, rates, '2026-11-09').locked).toBe(false);
        expect(estimateWithdrawal({ type: 'UK_SIPP', balance: 10_000 }, uk, rates, '2028-05-01').locked).toBe(true);
        expect(ukPensionAccessAge('2028-04-06')).toBe(57);
    });

    it('locked accounts owe no Zakat this year under the default approach', () => {
        const e = estimateWithdrawal({ type: 'CA_LIRA', balance: 10_000 }, ontario, rates, AS_OF);
        const z = accountZakat(e, [{ name: 'XEQT', value: 10_000, zakatablePercent: 30 }]);
        expect(z.due).toBe(false);
        expect(z.totals.zakat).toBe(0);
    });

    it('warns when holdings do not add up to the balance', () => {
        const e = estimateWithdrawal({ type: 'CA_TFSA', balance: 10_000 }, ontario, rates, AS_OF);
        expect(accountZakat(e, [{ name: 'XEQT', value: 8_000, zakatablePercent: 30 }]).warnings.some((w) => w.includes('uninvested cash'))).toBe(true);
    });
});

describe('portfolio: several accounts withdrawn together (user scenario)', () => {
    // Non-US-citizen Ontario resident, age 35, C$100k salary.
    const profile: TaxProfile = { residence: { country: 'CA', region: 'ON' }, usPerson: false, age: 35, annualIncome: 100_000 };
    const accounts: AccountInput[] = [
        { type: 'CA_FHSA', balance: 40_000 },
        { type: 'CA_TFSA', balance: 35_000 },
        { type: 'US_401K', balance: 20_000 },
        { type: 'CA_RRSP', balance: 30_000 },
    ];
    const stacked = estimatePortfolio(accounts, profile, rates, AS_OF);
    const separate = accounts.map((a) => estimateWithdrawal(a, profile, rates, AS_OF));

    it('TFSA is untouched; taxable accounts lose more when their withdrawals stack', () => {
        expect(stacked[1].netFraction).toBe(1);
        for (const i of [0, 2, 3]) expect(stacked[i].net).toBeLessThan(separate[i].net);
    });

    it('Canadian tax shares add up to the tax on all withdrawals together', () => {
        const taxableCad = 40_000 + 20_000 / 0.73 + 30_000; // 401(k) converted USD → CAD
        const total = incrementalTax(100_000, taxableCad, profile.residence).tax;
        const fhsa = stacked[0].lines.find((l) => l.key === 'domestic_tax')!.amount;
        const rrsp = stacked[3].lines.find((l) => l.key === 'domestic_tax')!.amount;
        expect(fhsa / 40_000).toBeCloseTo(rrsp / 30_000, 9); // same average rate
        expect(fhsa).toBeCloseTo(total * (40_000 / taxableCad), 6);
    });

    it('401(k): US withholding and penalty unchanged; Canada adds only tax beyond the US credit', () => {
        expect(stacked[2].lines.find((l) => l.key === 'source_tax')!.amount).toBe(6_000);
        expect(stacked[2].lines.find((l) => l.key === 'penalty')!.amount).toBe(2_000);
    });

    it('a first-home FHSA is tax-free and drops out of the stack', () => {
        const withHome = estimatePortfolio([{ ...accounts[0], qualifyingUse: true }, ...accounts.slice(1)], profile, rates, AS_OF);
        expect(withHome[0].netFraction).toBe(1);
        expect(withHome[3].net).toBeGreaterThan(stacked[3].net);
    });
});
