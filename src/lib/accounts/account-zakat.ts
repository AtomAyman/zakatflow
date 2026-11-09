// ─── Zakat on an account's holdings, scaled to what you'd receive ─────────
//
// Each holding is scaled by the account's net fraction (what you'd get in
// hand ÷ balance), then its own Zakatable % is applied: cash and gold 100%,
// stocks and funds from filings or the 30% estimate.

import type { WithdrawalEstimate } from './withdrawal';

export interface HoldingInput {
    name: string;
    /** Market value in the account's currency. */
    value: number;
    /** % of this holding's value that is Zakatable (100 for cash/gold, filings-based or 30 for stocks). */
    zakatablePercent: number;
    /** Where the percentage came from, shown to the user. */
    basis?: 'Calculated' | 'Calculated – check' | 'Estimated' | 'Your figure' | 'Cash' | 'Commodity';
}

export interface HoldingZakatRow extends HoldingInput {
    inHandValue: number;
    zakatable: number;
    zakat: number;
}

export interface AccountZakatResult {
    rows: HoldingZakatRow[];
    totals: { value: number; inHandValue: number; zakatable: number; zakat: number };
    netFraction: number;
    /** False when the account is locked: not due this year under the Guide's approach. */
    due: boolean;
    warnings: string[];
}

export const ZAKAT_RATE_HIJRI = 0.025;
export const ZAKAT_RATE_GREGORIAN = 0.02577;

export function accountZakat(
    estimate: WithdrawalEstimate,
    holdings: HoldingInput[],
    rate: number = ZAKAT_RATE_HIJRI
): AccountZakatResult {
    const warnings = [...estimate.warnings];
    const f = estimate.netFraction;

    const rows = holdings.map((h) => {
        const inHandValue = h.value * f;
        const zakatable = inHandValue * Math.min(100, Math.max(0, h.zakatablePercent)) / 100;
        return { ...h, inHandValue, zakatable, zakat: estimate.locked ? 0 : zakatable * rate };
    });

    const sum = (k: 'value' | 'inHandValue' | 'zakatable' | 'zakat') => rows.reduce((s, r) => s + r[k], 0);
    const totalValue = sum('value');
    if (estimate.balance > 0 && Math.abs(totalValue - estimate.balance) / estimate.balance > 0.01) {
        warnings.push(
            `Holdings add up to ${Math.round(totalValue).toLocaleString('en-US')} but the account balance is ${Math.round(estimate.balance).toLocaleString('en-US')}. Add any uninvested cash as a holding.`
        );
    }
    if (estimate.locked && estimate.lockedReason) warnings.unshift(estimate.lockedReason);

    return {
        rows,
        totals: { value: totalValue, inHandValue: sum('inHandValue'), zakatable: sum('zakatable'), zakat: sum('zakat') },
        netFraction: f,
        due: !estimate.locked,
        warnings,
    };
}
