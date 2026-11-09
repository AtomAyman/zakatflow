// ─── Income tax tables (2026) ─────────────────────────────────────────────
//
// Used to estimate the tax on a hypothetical withdrawal as
//   tax(income + withdrawal) − tax(income)
// i.e. the real incremental tax across brackets, not one marginal rate.
//
// Sources (verify each year; values are data, not logic):
//   US federal: IRS Rev. Proc. 2025-32 (tax year 2026).
//   Canada federal + ON/AB/QC: 2026 indexed brackets as published by CRA /
//     provincial agencies (cross-checked against several 2026 tables).
//   UK: 2026/27 rUK bands (personal allowance tapered above £100,000).
// Regions without a bracket table fall back to a flat approximate rate and
// the result is marked approximate.

import { CA_PROVINCES, US_STATES } from '../tax-data';

export type Country = 'US' | 'CA' | 'UK';
export type FilingStatus = 'single' | 'married_joint';

interface Bracket {
    upTo: number | null; // upper bound of taxable income for this rate
    rate: number;
}

interface Schedule {
    /** Income taxed at 0% (standard deduction / basic personal amount, modelled as a zero band). */
    allowance: number;
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

function scheduleTax(income: number, s: Schedule): number {
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
    // Ontario surtax and health premium are not modelled (understates ON tax slightly at high incomes).
    ON: {
        allowance: 12_989,
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
        brackets: [
            { upTo: 61_200, rate: 0.08 },
            { upTo: 154_259, rate: 0.10 },
            { upTo: 185_111, rate: 0.12 },
            { upTo: 246_813, rate: 0.13 },
            { upTo: 370_220, rate: 0.14 },
            { upTo: null, rate: 0.15 },
        ],
    },
    QC: {
        allowance: 18_952,
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
}

/** Total income tax on `income` (in the residence country's currency). */
export function incomeTax(income: number, res: TaxResidence): IncomeTaxResult {
    const notes: string[] = [];
    let approximate = false;
    const x = Math.max(0, income);

    if (res.country === 'US') {
        let tax = scheduleTax(x, US_FEDERAL[res.filingStatus ?? 'single']);
        const state = US_STATES.find((s) => s.code === res.region);
        if (state && state.rate > 0) {
            tax += x * state.rate;
            approximate = true;
            notes.push(`${state.name} tax estimated at a flat ${(state.rate * 100).toFixed(2)}%.`);
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
            if (res.region === 'ON') notes.push('Ontario surtax and health premium not included.');
        } else {
            const flat = CA_PROVINCES.find((p) => p.code === res.region);
            provincial = x * (flat?.rate ?? 0.1);
            approximate = true;
            notes.push(`${flat?.name ?? 'Provincial'} tax estimated at a flat ${((flat?.rate ?? 0.1) * 100).toFixed(1)}%.`);
        }
        return { tax: federal + provincial, approximate, notes };
    }

    return { tax: ukTax(x), approximate, notes };
}

/** Tax caused by adding `extra` on top of `baseIncome`. */
export function incrementalTax(baseIncome: number, extra: number, res: TaxResidence): IncomeTaxResult {
    const before = incomeTax(baseIncome, res);
    const after = incomeTax(baseIncome + extra, res);
    return { tax: Math.max(0, after.tax - before.tax), approximate: after.approximate, notes: after.notes };
}
