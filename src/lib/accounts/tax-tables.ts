// ─── Income tax tables (2026) ─────────────────────────────────────────────
//
// Used to estimate the tax on a hypothetical withdrawal as
//   tax(income + withdrawal) − tax(income)
// i.e. the real incremental tax across brackets, not one marginal rate.
//
// Sources (verify each year; values are data, not logic):
//   US federal: IRS Rev. Proc. 2025-32 (tax year 2026).
//   US states: Tax Foundation 2025 state table (see us-state-tax.ts).
//   Canada federal + provinces: 2026 brackets as published by CRA and the
//     provinces, cross-checked against several 2026 tables (Wealthsimple,
//     sched3, paycalc). Ontario surtax included. PEI and territories use a
//     flat approximate rate.
//   UK: 2026/27 rUK bands (personal allowance tapered above £100,000).
// Regions without a bracket table fall back to a flat approximate rate and
// the result is marked approximate.

import { CA_PROVINCES } from '../tax-data';
import { US_STATE_TAX_2025 } from './us-state-tax';

export type Country = 'US' | 'CA' | 'UK';
export type FilingStatus = 'single' | 'married_joint';

interface Bracket {
    upTo: number | null; // upper bound of taxable income for this rate
    rate: number;
}

interface Schedule {
    /**
     * US standard deduction / UK personal allowance: a deduction from income.
     * Canadian basic personal amounts: a non-refundable credit at the lowest rate
     * (set `allowanceIsCredit`), which does NOT shift the brackets.
     */
    allowance: number;
    allowanceIsCredit?: boolean;
    brackets: Bracket[];
}

function bracketTax(taxable: number, brackets: Bracket[]): number {
    let tax = 0;
    let lower = 0;
    for (const b of brackets) {
        const upper = b.upTo ?? Infinity;
        if (taxable <= lower) break;
        tax += (Math.min(taxable, upper) - lower) * b.rate;
        lower = upper;
    }
    return tax;
}

function scheduleTax(income: number, s: Schedule, skipDeduction = false): number {
    if (skipDeduction && !s.allowanceIsCredit) return bracketTax(Math.max(0, income), s.brackets);
    if (s.allowanceIsCredit) {
        return Math.max(0, bracketTax(income, s.brackets) - s.allowance * s.brackets[0].rate);
    }
    return bracketTax(Math.max(0, income - s.allowance), s.brackets);
}

// ── United States ──
const US_FEDERAL: Record<FilingStatus, Schedule> = {
    single: {
        allowance: 16_100,
        brackets: [
            { upTo: 12_400, rate: 0.10 },
            { upTo: 50_400, rate: 0.12 },
            { upTo: 105_700, rate: 0.22 },
            { upTo: 201_775, rate: 0.24 },
            { upTo: 256_225, rate: 0.32 },
            { upTo: 640_600, rate: 0.35 },
            { upTo: null, rate: 0.37 },
        ],
    },
    married_joint: {
        allowance: 32_200,
        brackets: [
            { upTo: 24_800, rate: 0.10 },
            { upTo: 100_800, rate: 0.12 },
            { upTo: 211_400, rate: 0.22 },
            { upTo: 403_550, rate: 0.24 },
            { upTo: 512_450, rate: 0.32 },
            { upTo: 768_700, rate: 0.35 },
            { upTo: null, rate: 0.37 },
        ],
    },
};

// ── Canada ──
const CA_FEDERAL: Schedule = {
    allowance: 16_452,
    allowanceIsCredit: true,
    brackets: [
        { upTo: 58_523, rate: 0.14 },
        { upTo: 117_045, rate: 0.205 },
        { upTo: 181_440, rate: 0.26 },
        { upTo: 258_482, rate: 0.29 },
        { upTo: null, rate: 0.33 },
    ],
};
const QC_FEDERAL_ABATEMENT = 0.165;

const CA_PROVINCIAL: Record<string, Schedule> = {
    ON: {
        allowance: 12_989,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 53_891, rate: 0.0505 },
            { upTo: 107_785, rate: 0.0915 },
            { upTo: 150_000, rate: 0.1116 },
            { upTo: 220_000, rate: 0.1216 },
            { upTo: null, rate: 0.1316 },
        ],
    },
    AB: {
        allowance: 22_769,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 61_200, rate: 0.08 },
            { upTo: 154_259, rate: 0.10 },
            { upTo: 185_111, rate: 0.12 },
            { upTo: 246_813, rate: 0.13 },
            { upTo: 370_220, rate: 0.14 },
            { upTo: null, rate: 0.15 },
        ],
    },
    BC: {
        allowance: 13_216,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 50_363, rate: 0.056 },
            { upTo: 100_728, rate: 0.077 },
            { upTo: 115_648, rate: 0.105 },
            { upTo: 140_430, rate: 0.1229 },
            { upTo: 190_405, rate: 0.147 },
            { upTo: 265_545, rate: 0.168 },
            { upTo: null, rate: 0.205 },
        ],
    },
    SK: {
        allowance: 20_381,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 54_532, rate: 0.105 },
            { upTo: 155_805, rate: 0.125 },
            { upTo: null, rate: 0.145 },
        ],
    },
    MB: {
        allowance: 15_780,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 47_000, rate: 0.108 },
            { upTo: 100_000, rate: 0.1275 },
            { upTo: null, rate: 0.174 },
        ],
    },
    NB: {
        allowance: 13_664,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 52_333, rate: 0.094 },
            { upTo: 104_666, rate: 0.14 },
            { upTo: 193_861, rate: 0.16 },
            { upTo: null, rate: 0.195 },
        ],
    },
    NS: {
        allowance: 11_932,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 30_995, rate: 0.0879 },
            { upTo: 61_991, rate: 0.1495 },
            { upTo: 97_417, rate: 0.1667 },
            { upTo: 157_124, rate: 0.175 },
            { upTo: null, rate: 0.21 },
        ],
    },
    NL: {
        allowance: 13_094,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 44_678, rate: 0.087 },
            { upTo: 89_354, rate: 0.145 },
            { upTo: 159_528, rate: 0.158 },
            { upTo: 223_340, rate: 0.178 },
            { upTo: 285_319, rate: 0.198 },
            { upTo: 570_638, rate: 0.208 },
            { upTo: 1_141_275, rate: 0.213 },
            { upTo: null, rate: 0.218 },
        ],
    },
    QC: {
        allowance: 18_952,
        allowanceIsCredit: true,
        brackets: [
            { upTo: 54_345, rate: 0.14 },
            { upTo: 108_680, rate: 0.19 },
            { upTo: 132_245, rate: 0.24 },
            { upTo: null, rate: 0.2575 },
        ],
    },
};

// ── United Kingdom (England, Wales, NI) ──
const UK_PERSONAL_ALLOWANCE = 12_570;
const UK_TAPER_START = 100_000;
const UK_BANDS: Bracket[] = [
    { upTo: 37_700, rate: 0.20 },   // basic rate: first £37,700 of taxable income
    { upTo: 125_140, rate: 0.40 },  // higher rate: taxable income up to £125,140
    { upTo: null, rate: 0.45 },     // additional rate
];

function ukTax(income: number): number {
    const allowance = Math.max(0, UK_PERSONAL_ALLOWANCE - Math.max(0, income - UK_TAPER_START) / 2);
    return bracketTax(Math.max(0, income - allowance), UK_BANDS);
}

export interface IncomeTaxResult {
    tax: number;
    approximate: boolean;
    notes: string[];
}

export interface TaxResidence {
    country: Country;
    /** US state or Canadian province code (e.g. "TX", "ON"). Ignored for the UK. */
    region?: string;
    filingStatus?: FilingStatus;
    /**
     * The income entered is *taxable* income from a tax return (US Form 1040
     * line 15, Canada line 26000, UK taxable income), so deductions and losses are
     * already applied. Skips the standard deduction / personal allowance
     * (Canadian credits still apply, as they do on the return).
     */
    incomeIsTaxable?: boolean;
}

/** Total income tax on `income` (in the residence country's currency). */
export function incomeTax(income: number, res: TaxResidence): IncomeTaxResult {
    const notes: string[] = [];
    let approximate = false;
    const x = Math.max(0, income);

    if (res.country === 'US') {
        const status = res.filingStatus ?? 'single';
        let tax = scheduleTax(x, US_FEDERAL[status], res.incomeIsTaxable);
        const st = res.region ? US_STATE_TAX_2025[res.region] : undefined;
        if (st) {
            const table = status === 'married_joint' ? st.married : st.single;
            const allowance = res.incomeIsTaxable ? 0 : status === 'married_joint' ? st.allowMarried : st.allowSingle;
            const brackets: Bracket[] = table.map(([, rate], i) => ({ upTo: table[i + 1]?.[0] ?? null, rate }));
            tax += bracketTax(Math.max(0, x - allowance), brackets);
            if (res.region === 'NY') notes.push('New York City and Yonkers income taxes are not included.');
        } else if (res.region) {
            approximate = true;
            notes.push(`No tax table for ${res.region}; state tax not included.`);
        }
        return { tax, approximate, notes };
    }

    if (res.country === 'CA') {
        let federal = scheduleTax(x, CA_FEDERAL);
        if (res.region === 'QC') federal *= 1 - QC_FEDERAL_ABATEMENT;
        const prov = res.region ? CA_PROVINCIAL[res.region] : undefined;
        let provincial = 0;
        if (prov) {
            provincial = scheduleTax(x, prov);
            if (res.region === 'ON') {
                // Ontario surtax: 20% of basic Ontario tax over $5,818 + 36% over $7,446 (2026).
                provincial += 0.2 * Math.max(0, provincial - 5_818) + 0.36 * Math.max(0, provincial - 7_446);
                notes.push('Ontario Health Premium not included (at most $900).');
            }
        } else {
            const flat = CA_PROVINCES.find((p) => p.code === res.region);
            provincial = x * (flat?.rate ?? 0.1);
            approximate = true;
            notes.push(`${flat?.name ?? 'Provincial'} tax estimated at a flat ${((flat?.rate ?? 0.1) * 100).toFixed(1)}%.`);
        }
        return { tax: federal + provincial, approximate, notes };
    }

    return { tax: res.incomeIsTaxable ? bracketTax(x, UK_BANDS) : ukTax(x), approximate, notes };
}

/** Tax caused by adding `extra` on top of `baseIncome`. */
export function incrementalTax(baseIncome: number, extra: number, res: TaxResidence): IncomeTaxResult {
    const before = incomeTax(baseIncome, res);
    const after = incomeTax(baseIncome + extra, res);
    return { tax: Math.max(0, after.tax - before.tax), approximate: after.approximate, notes: after.notes };
}
