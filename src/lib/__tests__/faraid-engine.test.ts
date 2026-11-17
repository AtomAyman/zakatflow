// Run with: npx tsx --test src/lib/__tests__/faraid-engine.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFaraid, calculateWaterfall, fracToString, type FaraidResult } from '../faraid-engine';
import type { HeirCounts, HeirKey } from '../wasiyyah-types';
import type { Madhab } from '../types';

function run(gender: 'male' | 'female', heirs: HeirCounts, madhab: Madhab = 'Hanafi') {
    return calculateFaraid({ deceasedGender: gender, madhab, heirs });
}

function shares(r: FaraidResult): Partial<Record<HeirKey, string>> {
    return Object.fromEntries(r.shares.map((s) => [s.key, s.basis === 'blocked' ? 'blocked' : fracToString(s.share)]));
}

function total(r: FaraidResult) {
    return r.shares.reduce((s, x) => s + x.share.n / x.share.d, 0) + r.unallocated.n / r.unallocated.d;
}

test('wife, son, daughter: 1/8 then 2:1 residue', () => {
    const r = run('male', { wife: 1, son: 1, daughter: 1 });
    assert.deepEqual(shares(r), { wife: '1/8', son: '7/12', daughter: '7/24' });
});

test('husband + 2 full sisters + mother: awl to 8', () => {
    const r = run('female', { husband: 1, fullSister: 2, mother: 1 });
    // 1/2 + 2/3 + 1/6 = 4/3 → denominators scale to 8: 3/8, 4/8, 1/8
    assert.equal(r.awl, true);
    assert.deepEqual(shares(r), { husband: '3/8', mother: '1/8', fullSister: '1/2' });
});

test('Umariyyatan: husband + father + mother', () => {
    const r = run('female', { husband: 1, father: 1, mother: 1 });
    assert.deepEqual(shares(r), { husband: '1/2', father: '1/3', mother: '1/6' });
});

test('Umariyyatan: wife + father + mother', () => {
    const r = run('male', { wife: 1, father: 1, mother: 1 });
    assert.deepEqual(shares(r), { wife: '1/4', father: '1/2', mother: '1/4' });
});

test('father with only daughters takes 1/6 + residue', () => {
    const r = run('male', { daughter: 1, father: 1, mother: 1 });
    // daughter 1/2, mother 1/6, father 1/6 + 1/6
    assert.deepEqual(shares(r), { father: '1/3', mother: '1/6', daughter: '1/2' });
    assert.equal(r.shares.find((s) => s.key === 'father')!.basis, 'fard+asaba');
});

test("daughter + son's daughter: takmila 1/6, then full sister residuary with daughters", () => {
    const r = run('male', { daughter: 1, sonsDaughter: 1, fullSister: 1 });
    assert.deepEqual(shares(r), { daughter: '1/2', sonsDaughter: '1/6', fullSister: '1/3' });
});

test("two daughters block son's daughter without a son's son", () => {
    const r = run('male', { daughter: 2, sonsDaughter: 1, fullBrother: 1 });
    assert.deepEqual(shares(r), { daughter: '2/3', sonsDaughter: 'blocked', fullBrother: '1/3' });
});

test("son's son makes son's daughter residuary even with two daughters", () => {
    const r = run('male', { daughter: 2, sonsSon: 1, sonsDaughter: 1 });
    assert.deepEqual(shares(r), { daughter: '2/3', sonsSon: '2/9', sonsDaughter: '1/9' });
});

test('radd: mother + daughter', () => {
    const r = run('male', { mother: 1, daughter: 1 });
    // 1/6 : 1/2 = 1 : 3 → 1/4, 3/4
    assert.equal(r.radd, true);
    assert.deepEqual(shares(r), { mother: '1/4', daughter: '3/4' });
});

test('radd excludes the spouse', () => {
    const r = run('male', { wife: 1, daughter: 2 });
    // wife 1/8, daughters get the remaining 7/8
    assert.deepEqual(shares(r), { wife: '1/8', daughter: '7/8' });
});

test('spouse only leaves residue unallocated with a warning', () => {
    const r = run('female', { husband: 1 });
    assert.deepEqual(shares(r), { husband: '1/2' });
    assert.equal(fracToString(r.unallocated), '1/2');
    assert.ok(r.warnings.length > 0);
});

test('mother reduced to 1/6 by two siblings even when blocked by father', () => {
    const r = run('male', { father: 1, mother: 1, fullBrother: 2 });
    assert.deepEqual(shares(r), { father: '5/6', mother: '1/6', fullBrother: 'blocked' });
});

test('maternal siblings share 1/3 equally regardless of gender', () => {
    const r = run('male', { mother: 1, maternalBrother: 1, maternalSister: 1, fullPaternalUncle: 1 });
    assert.deepEqual(shares(r), { mother: '1/6', maternalBrother: '1/6', maternalSister: '1/6', fullPaternalUncle: '1/2' });
});

test('Mushtaraka: Hanafi gives full brothers nothing', () => {
    const r = run('female', { husband: 1, mother: 1, maternalBrother: 2, fullBrother: 1 }, 'Hanafi');
    assert.deepEqual(shares(r), { husband: '1/2', mother: '1/6', fullBrother: '0', maternalBrother: '1/3' });
});

test("Mushtaraka: Shafi'i lets full brothers share the third", () => {
    const r = run('female', { husband: 1, mother: 1, maternalBrother: 2, fullBrother: 1 }, 'Shafi');
    assert.deepEqual(shares(r), { husband: '1/2', mother: '1/6', fullBrother: '1/9', maternalBrother: '2/9' });
});

test('full sister with daughters blocks paternal brother and nephews', () => {
    const r = run('male', { daughter: 1, fullSister: 1, paternalBrother: 1, fullBrothersSon: 1 });
    assert.deepEqual(shares(r), { daughter: '1/2', fullSister: '1/2', paternalBrother: 'blocked', fullBrothersSon: 'blocked' });
});

test('full sister 1/2 + paternal sister 1/6 + uncle residue', () => {
    const r = run('male', { fullSister: 1, paternalSister: 1, fullPaternalUncle: 1 });
    assert.deepEqual(shares(r), { fullSister: '1/2', paternalSister: '1/6', fullPaternalUncle: '1/3' });
});

test('grandmothers share 1/6; Hanbali keeps paternal grandmother with father', () => {
    const r1 = run('male', { father: 1, maternalGrandmother: 1, paternalGrandmother: 1, son: 1 }, 'Hanafi');
    assert.deepEqual(shares(r1), { father: '1/6', maternalGrandmother: '1/6', paternalGrandmother: 'blocked', son: '2/3' });
    const r2 = run('male', { father: 1, maternalGrandmother: 1, paternalGrandmother: 1, son: 1 }, 'Hanbali');
    assert.deepEqual(shares(r2), { father: '1/6', maternalGrandmother: '1/12', paternalGrandmother: '1/12', son: '2/3' });
});

test('grandfather replaces father and (Hanafi) excludes siblings; other madhabs warn', () => {
    const r = run('male', { paternalGrandfather: 1, fullBrother: 1, fullSister: 1, mother: 1 }, 'Hanafi');
    assert.deepEqual(shares(r), { mother: '1/6', paternalGrandfather: '5/6', fullBrother: 'blocked', fullSister: 'blocked' });
    assert.equal(r.warnings.length, 0);
    const r2 = run('male', { paternalGrandfather: 1, fullBrother: 1, fullSister: 1, mother: 1 }, 'Maliki');
    assert.deepEqual(shares(r2), shares(r));
    assert.ok(r2.warnings.some((w) => w.includes('Zayd')));
});

test('spouse filtered by gender and wives capped at 4', () => {
    const r = run('male', { husband: 1, wife: 6, son: 1 });
    assert.deepEqual(shares(r), { wife: '1/8', son: '7/8' });
    assert.equal(r.shares.find((s) => s.key === 'wife')!.count, 4);
});

test('shares always sum to 1 for a broad sweep', () => {
    const keys: HeirKey[] = ['husband', 'wife', 'father', 'mother', 'paternalGrandfather', 'maternalGrandmother',
        'son', 'daughter', 'sonsSon', 'sonsDaughter', 'fullBrother', 'fullSister', 'paternalSister', 'maternalSister', 'fullPaternalUncle'];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) {
        const heirs: HeirCounts = {};
        for (const k of keys) if (rnd() < 0.3) heirs[k] = 1 + Math.floor(rnd() * 3);
        for (const g of ['male', 'female'] as const) {
            for (const m of ['Hanafi', 'Shafi', 'Maliki', 'Hanbali'] as Madhab[]) {
                const r = run(g, heirs, m);
                if (r.shares.every((s) => s.basis === 'blocked') && r.unallocated.n === 0) continue;
                const t = total(r);
                if (r.shares.some((s) => s.basis !== 'blocked')) {
                    assert.ok(Math.abs(t - 1) < 1e-9, `sum ${t} for ${g}/${m} ${JSON.stringify(heirs)} → ${JSON.stringify(shares(r))}`);
                }
            }
        }
    }
});

test('waterfall: 1/3 cap and Hanafi debts to Allah from the third', () => {
    const w = calculateWaterfall({ madhab: 'Hanafi', grossEstate: 100000, funeral: 5000, debtsToPeople: 5000, debtsToAllah: 3000, bequestsFixed: 40000, bequestsPercent: 0 });
    assert.equal(w.netEstate, 90000);
    assert.equal(w.bequestCap, 30000);
    assert.equal(w.bequestsAllowed, 30000);
    assert.equal(w.bequestsOverCap, true);
    assert.equal(w.inheritance, 60000);
    const s = calculateWaterfall({ madhab: 'Shafi', grossEstate: 100000, funeral: 5000, debtsToPeople: 5000, debtsToAllah: 3000, bequestsFixed: 0, bequestsPercent: 10 });
    assert.equal(s.netEstate, 87000);
    assert.equal(s.bequestsAllowed, 8700);
    assert.equal(s.inheritance, 78300);
});
