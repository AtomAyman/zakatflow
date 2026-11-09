// ─── "What would I get in hand if I withdrew everything today?" ───────────
//
// Estimates the net amount from cashing out an account on the Zakat date,
// across borders. Under the Guide's default approach (methodology/accounts.md,
// approach A) Zakat on the account is then worked out on that net amount.
//
// Model:
//   1. Vested balance (unvested employer money is not yours: excluded).
//   2. Tax-free basis (Roth / 529 / RESP contributions) comes out free.
//   3. Fixed charges by account type: US 10%/20%/25% additional taxes,
//      UK Lifetime ISA 25% charge, RESP grant repayment and 20% AIP tax.
//      These apply wherever you live and are NOT treated as creditable abroad.
//   4. Income tax on the taxable part. Each country with a claim computes its
//      tax; foreign tax credits are approximated as "you pay the highest of
//      them" (credit = min(foreign tax, home tax)). Shown as a source-country
//      withholding line plus any extra residence-country tax.

import { incrementalTax, type Country, type TaxResidence } from './tax-tables';

export type AccountType =
    // United States
    | 'US_401K' | 'US_403B' | 'US_TSP' | 'US_457B'
    | 'US_TRADITIONAL_IRA' | 'US_SEP_IRA' | 'US_SIMPLE_IRA'
    | 'US_ROTH_IRA' | 'US_ROTH_401K'
    | 'US_HSA' | 'US_529' | 'US_BROKERAGE'
    // Canada
    | 'CA_RRSP' | 'CA_SPOUSAL_RRSP' | 'CA_RRIF' | 'CA_TFSA' | 'CA_FHSA'
    | 'CA_LIRA' | 'CA_RESP' | 'CA_NON_REGISTERED'
    // United Kingdom
    | 'UK_ISA' | 'UK_LIFETIME_ISA' | 'UK_DC_PENSION' | 'UK_SIPP' | 'UK_GIA';

export const ACCOUNT_CURRENCY: Record<Country, string> = { US: 'USD', CA: 'CAD', UK: 'GBP' };

export function accountCountry(type: AccountType): Country {
    return type.slice(0, 2) as Country;
}

export interface AccountInput {
    type: AccountType;
    /** Total balance in the account's currency. */
    balance: number;
    /** Unvested employer contributions included in `balance`. */
    unvested?: number;
    /** Contributions that come back tax- and penalty-free (Roth, 529, RESP). */
    contributions?: number;
    /** Government grants that must be repaid on early withdrawal (RESP CESG/CLB). */
    grantsToRepay?: number;
    /** The money is intended for the account's qualifying use (first home, education, medical). */
    qualifyingUse?: boolean;
    /** Left the employer in or after the year of turning 55 (US 401(k)/403(b)/TSP "rule of 55"). */
    separatedAtOrAfter55?: boolean;
    /** SIMPLE IRA opened less than two years ago (25% additional tax). */
    simpleIraFirstTwoYears?: boolean;
    /** The plan does not allow withdrawal at all right now (user-declared). */
    locked?: boolean;
}

export interface TaxProfile {
    residence: TaxResidence;
    /** US citizen or green-card holder: taxed by the US wherever they live. */
    usPerson: boolean;
    age: number;
    /** Other taxable income this year, in the residence currency. */
    annualIncome: number;
}

/** Exchange rates as USD value of one unit (the app's PriceData.exchangeRates format). */
export type UsdRates = Record<string, number>;

export interface WithdrawalLine {
    key: 'unvested' | 'penalty' | 'charge' | 'grant_repayment' | 'source_tax' | 'residence_tax' | 'us_citizen_tax' | 'domestic_tax';
    label: string;
    amount: number; // account currency, positive = reduces what you receive
    note?: string;
}

export interface WithdrawalEstimate {
    currency: string;
    balance: number;
    lines: WithdrawalLine[];
    net: number;
    /** net ÷ balance: apply to each holding to get its in-hand value. */
    netFraction: number;
    locked: boolean;
    lockedReason?: string;
    approximate: boolean;
    warnings: string[];
}

const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;

function convert(amount: number, from: string, to: string, rates: UsdRates): number {
    if (from === to) return amount;
    const f = rates[from];
    const t = rates[to];
    if (!f || !t) throw new Error(`Missing exchange rate for ${!f ? from : to}`);
    return (amount * f) / t;
}

/** UK normal minimum pension age: 55, rising to 57 on 6 April 2028. */
export function ukPensionAccessAge(asOf: string): number {
    return asOf >= '2028-04-06' ? 57 : 55;
}

const US_PRETAX: AccountType[] = ['US_401K', 'US_403B', 'US_TSP', 'US_457B', 'US_TRADITIONAL_IRA', 'US_SEP_IRA', 'US_SIMPLE_IRA'];
const RULE_OF_55: AccountType[] = ['US_401K', 'US_403B', 'US_TSP'];
const NO_COST: AccountType[] = ['US_BROKERAGE', 'CA_TFSA', 'CA_NON_REGISTERED', 'UK_ISA', 'UK_GIA'];

/** Statutory withholding a country applies to a lump sum paid to a non-resident (non-citizen). */
const NON_RESIDENT_LUMP_SUM_RATE: Record<Country, { rate: number; note: string }> = {
    US: {
        rate: 0.30,
        note: 'US withholding on a lump sum paid to a non-resident who is not a US citizen. Treaty rates (e.g. 15% for Canada) cover periodic pension payments, not lump sums.',
    },
    CA: {
        rate: 0.25,
        note: 'Canadian non-resident tax (Part XIII) on a lump-sum withdrawal. Periodic payments may qualify for a 15% treaty rate.',
    },
    UK: {
        rate: 0,
        note: 'UK pensions paid to non-residents are generally taxed only in the country of residence under UK tax treaties. Check your treaty.',
    },
};

interface PreparedAccount {
    lines: WithdrawalLine[];
    warnings: string[];
    /** Part of the withdrawal subject to income tax, in the account's currency. */
    taxable: number;
    lockedReason?: string;
}

/**
 * Taxes for a whole set of accounts withdrawn together, so the incremental
 * tax is stacked on one income rather than each account starting from the salary.
 * Values are this account's share, in the residence currency (US tax in USD).
 */
export interface StackedTax {
    residenceTax: number;
    usCitizenTax: number;
    approximate: boolean;
    notes: string[];
}

export function estimateWithdrawal(
    account: AccountInput,
    profile: TaxProfile,
    rates: UsdRates,
    asOf: string = new Date().toISOString().slice(0, 10),
    stacked?: StackedTax
): WithdrawalEstimate {
    const prep = prepareAccount(account, profile, asOf);
    return finishEstimate(account, profile, rates, prep, stacked);
}

function prepareAccount(account: AccountInput, profile: TaxProfile, asOf: string): PreparedAccount {
    const lines: WithdrawalLine[] = [];
    const warnings: string[] = [];
    const age = profile.age;
    const t = account.type;

    const unvested = Math.min(Math.max(0, account.unvested ?? 0), account.balance);
    if (unvested > 0) {
        lines.push({ key: 'unvested', label: 'Unvested employer contributions (not yet yours)', amount: unvested });
    }
    const vested = account.balance - unvested;
    const basis = Math.min(Math.max(0, account.contributions ?? 0), vested);

    // ── Locked accounts ──
    let lockedReason: string | undefined;
    if (account.locked) lockedReason = 'You marked this account as not withdrawable.';
    if (t === 'CA_LIRA') lockedReason = 'Locked-in account: not withdrawable before retirement age (limited unlocking aside).';
    if ((t === 'UK_DC_PENSION' || t === 'UK_SIPP') && age < ukPensionAccessAge(asOf)) {
        lockedReason = `UK pensions can't be accessed before age ${ukPensionAccessAge(asOf)}.`;
    }

    // ── 1. Which part is taxable, and fixed charges ──
    let taxable = 0;
    const charge = (key: WithdrawalLine['key'], label: string, amount: number, note?: string) => {
        if (amount > 0) lines.push({ key, label, amount, note });
    };

    if (NO_COST.includes(t)) {
        taxable = 0;
    } else if (US_PRETAX.includes(t)) {
        taxable = vested;
        const ruleOf55 = RULE_OF_55.includes(t) && account.separatedAtOrAfter55 && age >= 55;
        if (age < 59.5 && t !== 'US_457B' && !ruleOf55) {
            const r = t === 'US_SIMPLE_IRA' && account.simpleIraFirstTwoYears ? 0.25 : 0.10;
            charge('penalty', `US early-withdrawal additional tax (${pct(r)})`, vested * r, 'Applies before age 59½, wherever you live.');
        }
    } else if (t === 'US_ROTH_IRA' || t === 'US_ROTH_401K') {
        // Contributions come out tax- and penalty-free; earnings only if not qualified.
        const earnings = vested - basis;
        if (age < 59.5) {
            taxable = earnings;
            charge('penalty', 'US early-withdrawal additional tax on earnings (10%)', earnings * 0.10);
        }
        if (account.contributions === undefined) {
            warnings.push('Enter your total Roth contributions: they come out tax- and penalty-free, so the estimate is more accurate with them.');
        }
    } else if (t === 'US_HSA') {
        if (!account.qualifyingUse) {
            taxable = vested;
            if (age < 65) charge('penalty', 'HSA non-medical withdrawal additional tax (20%)', vested * 0.20);
        }
    } else if (t === 'US_529') {
        const earnings = vested - basis;
        if (!account.qualifyingUse) {
            taxable = earnings;
            charge('penalty', '529 non-qualified withdrawal additional tax on earnings (10%)', earnings * 0.10);
        }
    } else if (t === 'CA_RRSP' || t === 'CA_SPOUSAL_RRSP' || t === 'CA_RRIF') {
        taxable = vested;
    } else if (t === 'CA_FHSA') {
        taxable = account.qualifyingUse ? 0 : vested;
    } else if (t === 'CA_LIRA') {
        taxable = vested;
    } else if (t === 'CA_RESP') {
        const grants = Math.min(Math.max(0, account.grantsToRepay ?? 0), vested - basis);
        charge('grant_repayment', 'Government grants repaid (CESG/CLB)', grants);
        const growth = Math.max(0, vested - basis - grants);
        if (!account.qualifyingUse) {
            taxable = growth;
            const extra = profile.residence.country === 'CA' && profile.residence.region === 'QC' ? 0.12 : 0.20;
            charge('charge', `RESP additional tax on growth (${pct(extra)})`, growth * extra);
        }
    } else if (t === 'UK_LIFETIME_ISA') {
        if (!account.qualifyingUse && age < 60) {
            charge('charge', 'Lifetime ISA withdrawal charge (25%)', vested * 0.25);
        }
    } else if (t === 'UK_DC_PENSION' || t === 'UK_SIPP') {
        taxable = vested * 0.75; // 25% tax-free lump sum
    }

    return { lines, warnings, taxable, lockedReason };
}

/** Taxable amount of an account if withdrawn today, in the account's currency. */
export function taxableOnWithdrawal(account: AccountInput, profile: TaxProfile, asOf: string): number {
    return prepareAccount(account, profile, asOf).taxable;
}

function finishEstimate(
    account: AccountInput,
    profile: TaxProfile,
    rates: UsdRates,
    prep: PreparedAccount,
    stacked?: StackedTax
): WithdrawalEstimate {
    const country = accountCountry(account.type);
    const cur = ACCOUNT_CURRENCY[country];
    const resCur = ACCOUNT_CURRENCY[profile.residence.country];
    const { lines, warnings, taxable, lockedReason } = prep;
    let approximate = false;

    // ── 2. Income tax on the taxable part ──
    if (taxable > 0) {
        const res = profile.residence;
        const taxIn = (r: TaxResidence, incomeInR: number, amountInAccountCur: number) => {
            const rc = ACCOUNT_CURRENCY[r.country];
            const result = incrementalTax(incomeInR, convert(amountInAccountCur, cur, rc, rates), r);
            if (result.approximate) approximate = true;
            warnings.push(...result.notes.filter((n) => !warnings.includes(n)));
            return convert(result.tax, rc, cur, rates);
        };
        if (stacked) {
            if (stacked.approximate) approximate = true;
            warnings.push(...stacked.notes.filter((n) => !warnings.includes(n)));
        }

        const residenceTax = stacked
            ? convert(stacked.residenceTax, resCur, cur, rates)
            : taxIn(res, profile.annualIncome, taxable);
        const domestic = res.country === country;

        if (domestic && !(profile.usPerson && res.country !== 'US')) {
            lines.push({ key: 'domestic_tax', label: 'Income tax on the withdrawal', amount: residenceTax, note: 'Tax on your income plus the withdrawal, minus tax on your income alone.' });
        } else {
            approximate = true;
            // Source-country tax, if the account is foreign to where you live.
            let sourceTax = 0;
            if (!domestic) {
                const isUsPersonUsAccount = country === 'US' && profile.usPerson;
                if (!isUsPersonUsAccount) {
                    const nr = NON_RESIDENT_LUMP_SUM_RATE[country];
                    sourceTax = taxable * nr.rate;
                    if (sourceTax > 0) {
                        lines.push({ key: 'source_tax', label: `${country} non-resident withholding (${pct(nr.rate)})`, amount: sourceTax, note: nr.note });
                    } else {
                        warnings.push(nr.note);
                    }
                }
            }
            // A US person abroad is also taxed by the US as a citizen.
            let usCitizenTax = 0;
            if (profile.usPerson && res.country !== 'US') {
                if (stacked) {
                    usCitizenTax = convert(stacked.usCitizenTax, 'USD', cur, rates);
                } else {
                    const incomeUsd = convert(profile.annualIncome, resCur, 'USD', rates);
                    usCitizenTax = taxIn({ country: 'US', filingStatus: res.filingStatus }, incomeUsd, taxable);
                }
            }
            // Foreign tax credits ≈ you end up paying the highest jurisdiction's tax.
            const total = Math.max(sourceTax, residenceTax, usCitizenTax);
            const afterSource = total - sourceTax;
            if (usCitizenTax > 0 && usCitizenTax >= residenceTax && usCitizenTax > sourceTax) {
                lines.push({ key: 'us_citizen_tax', label: 'US tax as a citizen, after foreign tax credit', amount: afterSource, note: 'US citizens and green-card holders are taxed by the US wherever they live.' });
            } else if (afterSource > 0) {
                lines.push({
                    key: 'residence_tax',
                    label: `${res.country} income tax after foreign tax credit`,
                    amount: afterSource,
                    note: `${res.country} taxes the withdrawal as income (${fmt(residenceTax)} before credit) and credits tax already paid abroad.`,
                });
            } else if (sourceTax > 0) {
                warnings.push(`The ${country} withholding exceeds ${res.country} tax on this withdrawal, so no further ${res.country} tax is due. Some of the excess may be refundable by filing a ${country} return.`);
            }
            if (country === 'US' && res.country === 'CA') {
                warnings.push('Whether Canada credits the US 10% early-withdrawal tax is disputed; it is treated here as not creditable.');
            }
            if (country === 'US' && res.country === 'UK') {
                warnings.push('UK–US treatment of 401(k)/IRA lump sums is contested (treaty Article 17 and the saving clause). Treat this estimate as a guide only.');
            }
        }
    }

    const deductions = lines.reduce((s, l) => s + l.amount, 0);
    const net = Math.max(0, account.balance - deductions);
    return {
        currency: cur,
        balance: account.balance,
        lines,
        net,
        netFraction: account.balance > 0 ? net / account.balance : 0,
        locked: Boolean(lockedReason),
        lockedReason,
        approximate,
        warnings,
    };
}

function fmt(n: number): string {
    return Math.round(n).toLocaleString('en-US');
}

/**
 * Estimate every account as if all were withdrawn together on the Zakat date.
 * Taxable withdrawals are stacked on one income, so the brackets they push
 * into are shared out across accounts in proportion to their taxable amounts.
 * This is the default for the app: it answers "what would I have in hand if I
 * cashed out everything today?". Locked accounts are left out of the stack.
 */
export function estimatePortfolio(
    accounts: AccountInput[],
    profile: TaxProfile,
    rates: UsdRates,
    asOf: string = new Date().toISOString().slice(0, 10)
): WithdrawalEstimate[] {
    const res = profile.residence;
    const resCur = ACCOUNT_CURRENCY[res.country];
    const preps = accounts.map((a) => prepareAccount(a, profile, asOf));
    const taxableRes = preps.map((p, i) =>
        p.lockedReason ? 0 : convert(p.taxable, ACCOUNT_CURRENCY[accountCountry(accounts[i].type)], resCur, rates)
    );
    const totalRes = taxableRes.reduce((s, x) => s + x, 0);
    const resTotal = incrementalTax(profile.annualIncome, totalRes, res);

    let usTotal = 0;
    let usBase = 0;
    const taxableUsd = taxableRes.map((x) => convert(x, resCur, 'USD', rates));
    if (profile.usPerson && res.country !== 'US') {
        usBase = taxableUsd.reduce((s, x) => s + x, 0);
        usTotal = incrementalTax(convert(profile.annualIncome, resCur, 'USD', rates), usBase, {
            country: 'US',
            filingStatus: res.filingStatus,
        }).tax;
    }

    return accounts.map((a, i) => {
        const share = totalRes > 0 ? taxableRes[i] / totalRes : 0;
        const usShare = usBase > 0 ? taxableUsd[i] / usBase : 0;
        return finishEstimate(a, profile, rates, preps[i], {
            residenceTax: resTotal.tax * share,
            usCitizenTax: usTotal * usShare,
            approximate: resTotal.approximate,
            notes: resTotal.notes,
        });
    });
}
