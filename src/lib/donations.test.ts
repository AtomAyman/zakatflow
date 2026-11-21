import { describe, expect, it } from 'vitest';
import {
    addMonths,
    allocationProblems,
    groupPayments,
    instalmentDate,
    interestBalance,
    paymentsUntil,
    planProgress,
    planSchedule,
    splitAmount,
    zakatPaidForYear,
} from './donations';
import type { DonationEntry, DonationPlan, InterestEntry } from './types';

const don = (over: Partial<DonationEntry>): DonationEntry => ({
    id: Math.random().toString(36).slice(2),
    date: '2026-03-01',
    amount: 0,
    recipient: 'Masjid',
    notes: '',
    category: 'Zakat',
    ...over,
});

describe('splitAmount', () => {
    it('splits evenly to the cent; the last instalment absorbs the rounding', () => {
        expect(splitAmount(1000, 12)).toEqual([...Array(11).fill(83.33), 83.37]);
        expect(splitAmount(1000, 12).reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 10);
        expect(splitAmount(100, 4)).toEqual([25, 25, 25, 25]);
        expect(splitAmount(0.05, 2)).toEqual([0.02, 0.03]);
    });
    it('rejects invalid counts', () => {
        expect(() => splitAmount(100, 0)).toThrow();
        expect(() => splitAmount(100, 1.5)).toThrow();
    });
});

describe('instalment dates', () => {
    it('monthly keeps the start day and clamps short months', () => {
        expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
        expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
        expect(instalmentDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
        // Back to the 31st after a short month, not stuck on the 28th
        expect(instalmentDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
        expect(instalmentDate('2026-11-15', 'monthly', 2)).toBe('2027-01-15');
    });
    it('weekly, every two weeks, twice a month and quarterly', () => {
        expect(instalmentDate('2026-12-28', 'weekly', 1)).toBe('2027-01-04');
        expect(instalmentDate('2026-01-01', 'biweekly', 2)).toBe('2026-01-29');
        expect([0, 1, 2, 3].map((i) => instalmentDate('2026-01-01', 'semimonthly', i))).toEqual([
            '2026-01-01',
            '2026-01-16',
            '2026-02-01',
            '2026-02-16',
        ]);
        expect(instalmentDate('2026-11-30', 'quarterly', 1)).toBe('2027-02-28');
    });
    it('counts payments up to an end date', () => {
        expect(paymentsUntil('2026-01-01', 'monthly', '2026-12-31')).toBe(12);
        expect(paymentsUntil('2026-01-01', 'biweekly', '2026-12-31')).toBe(27);
        expect(paymentsUntil('2026-01-01', 'weekly', '2026-01-01')).toBe(1);
        expect(paymentsUntil('2026-01-01', 'once', '2027-01-01')).toBe(1);
    });
});

describe('planSchedule and planProgress', () => {
    const plan: DonationPlan = {
        id: 'p1',
        zakatYear: '2026',
        category: 'Zakat',
        totalAmount: 1200,
        frequency: 'monthly',
        startDate: '2026-04-01',
        numberOfPayments: 12,
        status: 'active',
        notes: '',
    };

    it('builds a dated schedule that adds up exactly', () => {
        const s = planSchedule(plan);
        expect(s).toHaveLength(12);
        expect(s[0]).toEqual({ index: 0, date: '2026-04-01', amount: 100 });
        expect(s[11].date).toBe('2027-03-01');
        expect(planSchedule({ ...plan, frequency: 'once', numberOfPayments: 12 })).toEqual([{ index: 0, date: '2026-04-01', amount: 1200 }]);
    });

    it('tracks paid, remaining, next and overdue instalments', () => {
        const paid = [
            don({ planId: 'p1', paymentId: 'a', amount: 60, recipient: 'Masjid' }),
            don({ planId: 'p1', paymentId: 'a', amount: 40, recipient: 'Food bank' }), // one payment, two recipients
            don({ planId: 'p1', paymentId: 'b', amount: 100 }),
            don({ amount: 500 }), // not part of the plan
        ];
        const p = planProgress(plan, paid, '2026-07-15');
        expect(p.paid).toBe(200);
        expect(p.remaining).toBe(1000);
        expect(p.paymentsMade).toBe(2);
        expect(p.next).toEqual({ index: 2, date: '2026-06-01', amount: 100 });
        expect(p.overdue).toBe(2); // 1 June and 1 July not yet paid
        expect(p.complete).toBe(false);
    });

    it('is complete when the total is paid, even if paid early in fewer payments', () => {
        const p = planProgress(plan, [don({ planId: 'p1', amount: 1200 })], '2026-04-02');
        expect(p).toMatchObject({ paid: 1200, remaining: 0, complete: true, overdue: 0 });
        expect(p.next).toBeUndefined();
    });
});

describe('payments', () => {
    it('validates the split between recipients', () => {
        expect(allocationProblems([{ recipient: 'Masjid', amount: 10 }])).toEqual([]);
        expect(allocationProblems([])).toHaveLength(1);
        expect(allocationProblems([{ recipient: ' ', amount: 0 }])).toHaveLength(2);
    });
    it('groups entries into payments; older entries without a payment id stand alone', () => {
        const g = groupPayments([
            don({ id: 'x', paymentId: 'a', amount: 10 }),
            don({ id: 'y', paymentId: 'a', amount: 15.5 }),
            don({ id: 'z', amount: 7 }),
        ]);
        expect(g.map((p) => [p.paymentId, p.entries.length, p.total])).toEqual([
            ['a', 2, 25.5],
            ['z', 1, 7],
        ]);
    });
    it('only Zakat counts toward Zakat paid (not Sadaqah, not interest given away)', () => {
        const list = [
            don({ zakatYear: '2026', amount: 100 }),
            don({ zakatYear: '2026', amount: 50, category: 'Sadaqah' }),
            don({ zakatYear: '2026', amount: 30, category: 'Interest' }),
            don({ zakatYear: '2025', amount: 999 }),
            don({ date: '2026-05-01', amount: 20 }), // no year recorded: falls back to the date
        ];
        expect(zakatPaidForYear(list, '2026')).toBe(120);
    });
});

describe('interestBalance', () => {
    const rates = { USD: 1, CAD: 0.73 };
    const interest: InterestEntry[] = [
        { id: 'i1', zakatYear: '2025', date: '2025-12-31', accountName: 'Chase savings', currency: 'USD', amount: 120, period: 'year', notes: '' },
        { id: 'i2', zakatYear: '2026', date: '2026-01-31', accountName: 'EQ Bank', currency: 'CAD', amount: 100, period: 'month', notes: '' },
    ];
    it('converts to the base currency and subtracts what was given away', () => {
        const b = interestBalance(interest, [don({ category: 'Interest', zakatYear: '2026', amount: 50 })], 'USD', rates);
        expect(b).toEqual({ earned: 193, givenAway: 50, outstanding: 143 });
    });
    it('can be limited to Zakat years up to a given year', () => {
        expect(interestBalance(interest, [], 'USD', rates, '2025')).toEqual({ earned: 120, givenAway: 0, outstanding: 120 });
    });
    it('never goes negative if more was given away than recorded', () => {
        expect(interestBalance(interest.slice(0, 1), [don({ category: 'Interest', amount: 500 })], 'USD', rates).outstanding).toBe(0);
    });
});
