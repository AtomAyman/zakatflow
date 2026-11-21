/**
 * Donation plans, payments and interest purification: pure functions, no I/O.
 *
 * Fiqh basis (A Guide to Zakāt, Muftī Mohammed Wahaajuddin):
 * - "It is better to pay one's zakāt as soon as possible… It is permissible to
 *   pay zakāt in installments." So a Zakat plan may run past the Zakat date.
 * - "It is permissible to pay zakāt in advance… The amount paid in advance will
 *   be subtracted from the amount due." So instalments can also be paid during
 *   the year toward the next Zakat date.
 * Interest (owner's ruling, to be confirmed by the Muftī): all interest earned
 * is given away in full. Giving it away is not Zakat and not Sadaqah (no reward
 * is expected), and interest still held is not the owner's wealth, so it is not
 * Zakatable.
 */

import type { DonationEntry, DonationPlan, InterestEntry, PlanFrequency } from './types';
import { convertToBaseCurrency } from './price-service';

export const FREQUENCY_LABELS: Record<PlanFrequency, string> = {
    once: 'One payment',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    semimonthly: 'Twice a month',
    monthly: 'Monthly',
    quarterly: 'Every 3 months',
};

// ─── Dates ────────────────────────────────────────────────

function parseDate(iso: string): { y: number; m: number; d: number } {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) throw new Error(`Invalid date: ${iso}`);
    return { y, m, d };
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function iso(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Same day `months` later, clamped to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: string, months: number, day?: number): string {
    const { y, m, d } = parseDate(date);
    const total = y * 12 + (m - 1) + months;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    return iso(ny, nm, Math.min(day ?? d, daysInMonth(ny, nm)));
}

export function addDays(date: string, days: number): string {
    const { y, m, d } = parseDate(date);
    return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Date of instalment `i` (0-based). Monthly dates keep the start day where the month allows. */
export function instalmentDate(startDate: string, frequency: PlanFrequency, i: number): string {
    switch (frequency) {
        case 'once':
            return startDate;
        case 'weekly':
            return addDays(startDate, 7 * i);
        case 'biweekly':
            return addDays(startDate, 14 * i);
        case 'semimonthly': {
            // The start day and 15 days later, every month (e.g. 1st and 16th).
            const base = addMonths(startDate, Math.floor(i / 2), parseDate(startDate).d);
            return i % 2 === 0 ? base : addDays(base, 15);
        }
        case 'monthly':
            return addMonths(startDate, i, parseDate(startDate).d);
        case 'quarterly':
            return addMonths(startDate, 3 * i, parseDate(startDate).d);
    }
}

// ─── Plans ────────────────────────────────────────────────

export interface Instalment {
    index: number;
    date: string;
    amount: number;
}

/**
 * Split `total` into `n` instalments to the cent: every instalment is the same
 * except the last, which absorbs the rounding so the total is exact.
 */
export function splitAmount(total: number, n: number): number[] {
    if (!(n >= 1) || !Number.isInteger(n)) throw new Error('Number of payments must be a whole number of at least 1.');
    const cents = Math.round(total * 100);
    if (cents < 0) throw new Error('Amount cannot be negative.');
    const each = Math.floor(cents / n);
    const amounts = Array.from({ length: n }, () => each / 100);
    amounts[n - 1] = (cents - each * (n - 1)) / 100;
    return amounts;
}

export function planSchedule(plan: Pick<DonationPlan, 'totalAmount' | 'frequency' | 'startDate' | 'numberOfPayments'>): Instalment[] {
    const n = plan.frequency === 'once' ? 1 : plan.numberOfPayments;
    return splitAmount(plan.totalAmount, n).map((amount, index) => ({
        index,
        date: instalmentDate(plan.startDate, plan.frequency, index),
        amount,
    }));
}

/** How many instalments fall on or before `endDate` (at least 1). */
export function paymentsUntil(startDate: string, frequency: PlanFrequency, endDate: string): number {
    if (frequency === 'once' || endDate < startDate) return 1;
    let n = 0;
    while (n < 1000 && instalmentDate(startDate, frequency, n) <= endDate) n++;
    return Math.max(1, n);
}

export interface PlanProgress {
    paid: number;
    remaining: number;
    paymentsMade: number;
    /** Next instalment still to pay, if any. */
    next?: Instalment;
    /** Instalments whose date has passed but which are not yet covered by payments. */
    overdue: number;
    complete: boolean;
}

/** Payments made toward a plan are the donation entries carrying its id. */
export function planProgress(plan: DonationPlan, donations: DonationEntry[], today: string): PlanProgress {
    const entries = donations.filter((d) => d.planId === plan.id);
    const paid = round2(entries.reduce((s, d) => s + d.amount, 0));
    const remaining = round2(Math.max(0, plan.totalAmount - paid));
    const payments = new Set(entries.map((d) => d.paymentId ?? d.id)).size;
    const schedule = planSchedule(plan);

    // Instalments covered so far by the amount paid (handles over/under-payments).
    let covered = 0;
    let running = 0;
    for (const inst of schedule) {
        running = round2(running + inst.amount);
        if (running <= paid + 0.005) covered++;
        else break;
    }
    const next = remaining > 0 ? schedule[covered] : undefined;
    const overdue = remaining > 0 ? schedule.filter((s, i) => i >= covered && s.date < today).length : 0;
    return { paid, remaining, paymentsMade: payments, next, overdue, complete: remaining <= 0 };
}

// ─── Payments ─────────────────────────────────────────────

export interface Allocation {
    recipient: string;
    amount: number;
}

/** Problems with a payment's split between recipients (empty = valid). */
export function allocationProblems(allocations: Allocation[]): string[] {
    const problems: string[] = [];
    if (allocations.length === 0) problems.push('Add at least one recipient.');
    allocations.forEach((a, i) => {
        if (!a.recipient.trim()) problems.push(`Recipient ${i + 1} needs a name.`);
        if (!(a.amount > 0)) problems.push(`Recipient ${i + 1} needs an amount above zero.`);
    });
    return problems;
}

/** Donation entries grouped into payments (one per paymentId; older entries stand alone). */
export function groupPayments(donations: DonationEntry[]): { paymentId: string; entries: DonationEntry[]; total: number }[] {
    const groups = new Map<string, DonationEntry[]>();
    for (const d of donations) {
        const key = d.paymentId ?? d.id;
        groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    return [...groups.entries()].map(([paymentId, entries]) => ({
        paymentId,
        entries,
        total: round2(entries.reduce((s, d) => s + d.amount, 0)),
    }));
}

/** Zakat paid toward a Zakat year: only the 'Zakat' category counts. */
export function zakatPaidForYear(donations: DonationEntry[], year: string): number {
    return round2(
        donations
            .filter((d) => d.category === 'Zakat' && (d.zakatYear || d.date.slice(0, 4)) === year)
            .reduce((s, d) => s + d.amount, 0)
    );
}

// ─── Interest ─────────────────────────────────────────────

export interface InterestBalance {
    /** Interest earned, in base currency. */
    earned: number;
    /** Interest given away (donations in the 'Interest' category). */
    givenAway: number;
    /** Still to give away. */
    outstanding: number;
}

/**
 * Interest earned and given away up to and including `throughYear` (all years
 * if omitted). Interest amounts are converted to the base currency; donations
 * are recorded in the base currency.
 */
export function interestBalance(
    interest: InterestEntry[],
    donations: DonationEntry[],
    baseCurrency: string,
    rates: Record<string, number>,
    throughYear?: string
): InterestBalance {
    const inRange = (year: string | undefined) => !throughYear || !year || year <= throughYear;
    const earned = round2(
        interest
            .filter((e) => inRange(e.zakatYear))
            .reduce((s, e) => s + convertToBaseCurrency(e.amount, e.currency, baseCurrency, rates), 0)
    );
    const givenAway = round2(
        donations
            .filter((d) => d.category === 'Interest' && inRange(d.zakatYear || d.date.slice(0, 4)))
            .reduce((s, d) => s + d.amount, 0)
    );
    return { earned, givenAway, outstanding: round2(Math.max(0, earned - givenAway)) };
}

/** Interest per account (by assetId, else account name), in base currency. */
export function interestByAccount(
    interest: InterestEntry[],
    baseCurrency: string,
    rates: Record<string, number>
): { key: string; accountName: string; earned: number; entries: number }[] {
    const map = new Map<string, { key: string; accountName: string; earned: number; entries: number }>();
    for (const e of interest) {
        const key = e.assetId || e.accountName.trim().toLowerCase();
        const row = map.get(key) ?? { key, accountName: e.accountName, earned: 0, entries: 0 };
        row.earned = round2(row.earned + convertToBaseCurrency(e.amount, e.currency, baseCurrency, rates));
        row.entries++;
        map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.earned - a.earned);
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
