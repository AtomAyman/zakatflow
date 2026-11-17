// ─── Faraid (Islamic Inheritance) Engine ──────────────────
// Pure functions, exact rational arithmetic. Given the deceased's gender,
// madhab and surviving relatives, returns each heir group's share of the
// distributable estate (after funeral, debts and bequests).
//
// Covers: fixed shares (fard), residuaries (asaba bi-nafsihi / bil-ghayr /
// ma'al-ghayr), exclusion (hajb hirman), awl, radd, Umariyyatan and
// Mushtaraka. See docs/wasiyyah-plan.md for scope and known gaps.

import type { Madhab } from './types';
import { type Gender, type HeirCounts, type HeirKey, HEIR_META, HEIR_ORDER } from './wasiyyah-types';

// ─── Fractions ────────────────────────────────────────────

export interface Fraction {
    n: number;
    d: number;
}

function gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
}

export function frac(n: number, d = 1): Fraction {
    if (d < 0) {
        n = -n;
        d = -d;
    }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
}

export const ZERO = frac(0);
export const ONE = frac(1);
export const add = (a: Fraction, b: Fraction) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Fraction, b: Fraction) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Fraction, b: Fraction) => frac(a.n * b.n, a.d * b.d);
export const div = (a: Fraction, b: Fraction) => frac(a.n * b.d, a.d * b.n);
export const cmp = (a: Fraction, b: Fraction) => a.n * b.d - b.n * a.d;
export const isZero = (a: Fraction) => a.n === 0;
export const toNumber = (a: Fraction) => a.n / a.d;
export const fracToString = (a: Fraction) => (a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`);
const sum = (xs: Fraction[]) => xs.reduce(add, ZERO);

// ─── Result types ─────────────────────────────────────────

export type ShareBasis = 'fard' | 'asaba' | 'fard+asaba' | 'blocked';

export interface HeirShare {
    key: HeirKey;
    count: number;
    basis: ShareBasis;
    /** Original Quranic share before awl/radd (group total). */
    fard: Fraction;
    /** Final share of the distributable estate (group total). */
    share: Fraction;
    /** Final share per individual. */
    perPerson: Fraction;
    reason: string;
}

export interface FaraidResult {
    shares: HeirShare[];          // every relation that was entered, incl. blocked
    awl: boolean;
    radd: boolean;
    unallocated: Fraction;        // goes to dhawu al-arham / bayt al-mal
    warnings: string[];
}

export interface FaraidInput {
    deceasedGender: Gender;
    madhab: Madhab;
    heirs: HeirCounts;
}

// ─── Engine ───────────────────────────────────────────────

type AsabaLevel = { keys: HeirKey[]; label: string };

const RESIDUARY_LEVELS: AsabaLevel[] = [
    { keys: ['son', 'daughter'], label: 'son' },
    { keys: ['sonsSon', 'sonsDaughter'], label: "son's son" },
    { keys: ['father'], label: 'father' },
    { keys: ['paternalGrandfather'], label: 'paternal grandfather' },
    { keys: ['fullBrother', 'fullSister'], label: 'full brother' },
    { keys: ['fullSister'], label: 'full sister (residuary with daughters)' },
    { keys: ['paternalBrother', 'paternalSister'], label: 'paternal half-brother' },
    { keys: ['paternalSister'], label: 'paternal half-sister (residuary with daughters)' },
    { keys: ['fullBrothersSon'], label: "full brother's son" },
    { keys: ['paternalBrothersSon'], label: "paternal half-brother's son" },
    { keys: ['fullPaternalUncle'], label: 'full paternal uncle' },
    { keys: ['paternalPaternalUncle'], label: 'paternal half-uncle' },
    { keys: ['fullPaternalUnclesSon'], label: "full paternal uncle's son" },
    { keys: ['paternalPaternalUnclesSon'], label: "paternal half-uncle's son" },
];

const FEMALE_KEYS = new Set<HeirKey>([
    'wife', 'mother', 'maternalGrandmother', 'paternalGrandmother', 'daughter',
    'sonsDaughter', 'fullSister', 'paternalSister', 'maternalSister',
]);

/** Normalise raw counts: drop invalid spouse, clamp maxima, drop zeros. */
export function normaliseHeirs(heirs: HeirCounts, deceasedGender: Gender): Record<HeirKey, number> {
    const out = {} as Record<HeirKey, number>;
    for (const key of HEIR_ORDER) {
        const meta = HEIR_META[key];
        let n = Math.max(0, Math.floor(heirs[key] ?? 0));
        if (meta.onlyIf && meta.onlyIf !== deceasedGender) n = 0;
        if (meta.max !== undefined) n = Math.min(n, meta.max);
        out[key] = n;
    }
    return out;
}

export function calculateFaraid({ deceasedGender, madhab, heirs }: FaraidInput): FaraidResult {
    const c = normaliseHeirs(heirs, deceasedGender);
    const has = (k: HeirKey) => c[k] > 0;
    const warnings: string[] = [];

    const maleDesc = has('son') || has('sonsSon');
    const femaleDesc = has('daughter') || has('sonsDaughter');
    const anyDesc = maleDesc || femaleDesc;
    const siblingCount =
        c.fullBrother + c.fullSister + c.paternalBrother + c.paternalSister +
        c.maternalBrother + c.maternalSister;

    // ── 1. Exclusion (hajb hirman) ──
    const blocked: Partial<Record<HeirKey, string>> = {};
    const block = (k: HeirKey, reason: string) => {
        if (has(k) && !blocked[k]) blocked[k] = reason;
    };

    if (has('father')) block('paternalGrandfather', 'Excluded by the father');
    if (has('mother')) {
        block('maternalGrandmother', 'Excluded by the mother');
        block('paternalGrandmother', 'Excluded by the mother');
    }
    if (has('father') && madhab !== 'Hanbali') {
        block('paternalGrandmother', 'Excluded by the father (majority view; Hanbali school differs)');
    }
    if (has('son')) {
        block('sonsSon', 'Excluded by the son');
        block('sonsDaughter', 'Excluded by the son');
    }
    if (c.daughter >= 2 && !has('sonsSon')) {
        block('sonsDaughter', 'Daughters have completed the 2/3 and there is no son\'s son to make her a residuary');
    }

    const grandfatherInherits = has('paternalGrandfather') && !blocked.paternalGrandfather;
    const siblingBlocker = maleDesc
        ? 'Excluded by a male descendant'
        : has('father')
            ? 'Excluded by the father'
            : grandfatherInherits
                ? `Excluded by the paternal grandfather (Hanafi view${madhab === 'Hanafi' ? '' : ' — see note'})`
                : null;

    if (grandfatherInherits && madhab !== 'Hanafi' && !maleDesc &&
        (has('fullBrother') || has('fullSister') || has('paternalBrother') || has('paternalSister'))) {
        warnings.push(
            `Grandfather with siblings: the ${madhab} school has the grandfather share with full/paternal siblings ` +
            '(the method of Zayd ibn Thabit). This calculator currently applies the Hanafi view (grandfather excludes them). ' +
            'Please have a scholar confirm these shares.'
        );
    }

    if (siblingBlocker) {
        for (const k of ['fullBrother', 'fullSister', 'paternalBrother', 'paternalSister'] as HeirKey[]) {
            block(k, siblingBlocker);
        }
    }
    if (has('fullBrother')) {
        block('paternalBrother', 'Excluded by the full brother');
        block('paternalSister', 'Excluded by the full brother');
    }
    const fullSisterInherits = has('fullSister') && !blocked.fullSister;
    const fullSisterIsResiduaryWithDaughters = fullSisterInherits && !has('fullBrother') && femaleDesc;
    if (fullSisterIsResiduaryWithDaughters) {
        block('paternalBrother', 'Excluded by the full sister (residuary with daughters)');
        block('paternalSister', 'Excluded by the full sister (residuary with daughters)');
    }
    if (fullSisterInherits && c.fullSister >= 2 && !has('paternalBrother')) {
        block('paternalSister', 'Full sisters have completed the 2/3 and there is no paternal brother to make her a residuary');
    }

    if (anyDesc) {
        block('maternalBrother', 'Excluded by a descendant');
        block('maternalSister', 'Excluded by a descendant');
    } else if (has('father') || grandfatherInherits) {
        const who = has('father') ? 'the father' : 'the paternal grandfather';
        block('maternalBrother', `Excluded by ${who}`);
        block('maternalSister', `Excluded by ${who}`);
    }

    const inherits = (k: HeirKey) => has(k) && !blocked[k];

    // ── 2. Find the residuary level (closest asaba wins, the rest are excluded) ──
    let asabaLevel: AsabaLevel | null = null;
    for (const level of RESIDUARY_LEVELS) {
        const lead = level.keys[0];
        if (!inherits(lead)) continue;
        // Sister-only levels are residuary only when they are "ma'al ghayr" (with daughters)
        if (level.keys.length === 1 && lead === 'fullSister') {
            if (!(femaleDesc && !has('fullBrother'))) continue;
        }
        if (level.keys.length === 1 && lead === 'paternalSister') {
            if (!(femaleDesc && !has('paternalBrother') && !fullSisterInherits)) continue;
        }
        asabaLevel = level;
        break;
    }

    if (asabaLevel) {
        const idx = RESIDUARY_LEVELS.indexOf(asabaLevel);
        const winner = asabaLevel.label;
        // Male agnates below the winning level are excluded. (Fard-capable females below
        // — e.g. sisters when the residuary is a nephew — cannot be below, as their levels
        // sit above nephews; sisters below a father are already blocked.)
        for (const level of RESIDUARY_LEVELS.slice(idx + 1)) {
            for (const k of level.keys) {
                if (FEMALE_KEYS.has(k)) continue;
                if (k === 'father' || k === 'paternalGrandfather') continue; // they also hold fard
                block(k, `Excluded by the closer residuary heir (${winner})`);
            }
        }
    }
    // Nephews/uncles are excluded by father or grandfather even when those take only fard
    if (has('father') || grandfatherInherits) {
        const who = has('father') ? 'the father' : 'the paternal grandfather';
        for (const k of ['fullBrothersSon', 'paternalBrothersSon', 'fullPaternalUncle', 'paternalPaternalUncle',
            'fullPaternalUnclesSon', 'paternalPaternalUnclesSon'] as HeirKey[]) {
            block(k, `Excluded by ${who}`);
        }
    }

    // ── 3. Fixed shares (fard) ──
    const fard: Partial<Record<HeirKey, Fraction>> = {};
    const reason: Partial<Record<HeirKey, string>> = {};
    const setFard = (k: HeirKey, f: Fraction, why: string) => {
        fard[k] = f;
        reason[k] = why;
    };

    if (inherits('husband')) {
        setFard('husband', anyDesc ? frac(1, 4) : frac(1, 2),
            anyDesc ? '1/4 because the deceased has descendants' : '1/2 because the deceased has no descendants');
    }
    if (inherits('wife')) {
        const f = anyDesc ? frac(1, 8) : frac(1, 4);
        setFard('wife', f, `${fracToString(f)} ${anyDesc ? 'because the deceased has descendants' : 'because the deceased has no descendants'}${c.wife > 1 ? ', shared equally between the wives' : ''}`);
    }

    const spouseFard = fard.husband ?? fard.wife ?? ZERO;
    const umariyyatan = inherits('father') && inherits('mother') && !anyDesc && siblingCount < 2 &&
        (inherits('husband') || inherits('wife'));

    for (const p of ['father', 'paternalGrandfather'] as HeirKey[]) {
        if (!inherits(p)) continue;
        const who = p === 'father' ? 'Father' : 'Grandfather';
        if (maleDesc) setFard(p, frac(1, 6), `${who}: 1/6 because the deceased has a male descendant`);
        else if (femaleDesc) setFard(p, frac(1, 6), `${who}: 1/6 plus any residue, because the deceased has only female descendants`);
        else reason[p] = `${who}: residuary (takes what remains) as there are no descendants`;
    }

    if (inherits('mother')) {
        if (umariyyatan) {
            setFard('mother', mul(frac(1, 3), sub(ONE, spouseFard)),
                "1/3 of what remains after the spouse's share (Umariyyatan ruling)");
        } else if (anyDesc) {
            setFard('mother', frac(1, 6), '1/6 because the deceased has descendants');
        } else if (siblingCount >= 2) {
            setFard('mother', frac(1, 6), '1/6 because the deceased has two or more siblings');
        } else {
            setFard('mother', frac(1, 3), '1/3: no descendants and fewer than two siblings');
        }
    }

    const grandmothers = (['maternalGrandmother', 'paternalGrandmother'] as HeirKey[]).filter(inherits);
    for (const g of grandmothers) {
        setFard(g, frac(1, 6 * grandmothers.length),
            grandmothers.length > 1 ? 'Grandmothers share 1/6 equally' : 'Grandmother takes 1/6');
    }

    if (inherits('daughter') && !has('son')) {
        setFard('daughter', c.daughter === 1 ? frac(1, 2) : frac(2, 3),
            c.daughter === 1 ? '1/2 as the only daughter with no son' : '2/3 shared between two or more daughters with no son');
    }

    if (inherits('sonsDaughter') && !has('sonsSon')) {
        if (c.daughter === 0) {
            setFard('sonsDaughter', c.sonsDaughter === 1 ? frac(1, 2) : frac(2, 3),
                c.sonsDaughter === 1 ? "1/2 in place of a daughter" : "2/3 shared, in place of daughters");
        } else if (c.daughter === 1) {
            setFard('sonsDaughter', frac(1, 6), '1/6 to complete the two-thirds with the daughter');
        }
    }

    if (inherits('fullSister') && !has('fullBrother') && !femaleDesc) {
        setFard('fullSister', c.fullSister === 1 ? frac(1, 2) : frac(2, 3),
            c.fullSister === 1 ? '1/2 as the only full sister' : '2/3 shared between full sisters');
    }

    if (inherits('paternalSister') && !has('paternalBrother') && !femaleDesc) {
        if (c.fullSister === 0 || !fullSisterInherits) {
            setFard('paternalSister', c.paternalSister === 1 ? frac(1, 2) : frac(2, 3),
                c.paternalSister === 1 ? '1/2 as the only sister' : '2/3 shared between sisters');
        } else if (c.fullSister === 1) {
            setFard('paternalSister', frac(1, 6), '1/6 to complete the two-thirds with the full sister');
        }
    }

    const maternalSiblings = (['maternalBrother', 'maternalSister'] as HeirKey[]).filter(inherits);
    const maternalHeads = maternalSiblings.reduce((s, k) => s + c[k], 0);
    if (maternalHeads > 0) {
        const total = maternalHeads === 1 ? frac(1, 6) : frac(1, 3);
        for (const k of maternalSiblings) {
            setFard(k, mul(total, frac(c[k], maternalHeads)),
                maternalHeads === 1 ? '1/6 as the only maternal sibling' : '1/3 shared equally (male and female alike) between maternal siblings');
        }
    }

    // ── 4. Mushtaraka (Himariyya): full siblings left with nothing ──
    let fardTotal = sum(Object.values(fard) as Fraction[]);
    if (asabaLevel?.label === 'full brother' && maternalHeads >= 2 && isZero(sub(ONE, fardTotal)) &&
        (inherits('husband')) && (madhab === 'Shafi' || madhab === 'Maliki')) {
        const heads = maternalHeads + c.fullBrother + c.fullSister;
        const third = frac(1, 3);
        for (const k of [...maternalSiblings, 'fullBrother', 'fullSister'] as HeirKey[]) {
            if (!inherits(k)) continue;
            setFard(k, mul(third, frac(c[k], heads)),
                `Mushtaraka: full and maternal siblings share 1/3 equally (${madhab} view)`);
        }
        asabaLevel = null;
        fardTotal = sum(Object.values(fard) as Fraction[]);
    } else if (asabaLevel?.label === 'full brother' && maternalHeads >= 2 && isZero(sub(ONE, fardTotal)) && inherits('husband')) {
        warnings.push(`Mushtaraka case: in the ${madhab} school full siblings receive nothing here; the Shafi'i and Maliki schools let them share the maternal siblings' 1/3.`);
    }

    // ── 5. Awl / residue / radd ──
    const final: Partial<Record<HeirKey, Fraction>> = {};
    const basis: Partial<Record<HeirKey, ShareBasis>> = {};
    let awl = false;
    let radd = false;
    let unallocated = ZERO;

    for (const [k, f] of Object.entries(fard) as [HeirKey, Fraction][]) {
        final[k] = f;
        basis[k] = 'fard';
    }

    const residue = sub(ONE, fardTotal);

    if (cmp(fardTotal, ONE) > 0) {
        awl = true;
        for (const k of Object.keys(final) as HeirKey[]) final[k] = div(final[k]!, fardTotal);
        if (asabaLevel) {
            for (const k of asabaLevel.keys) {
                if (!inherits(k) || fard[k]) continue;
                final[k] = ZERO;
                basis[k] = 'asaba';
                reason[k] = 'Residuary, but the fixed shares exhaust the estate (awl)';
            }
        }
    } else if (asabaLevel) {
        const members = asabaLevel.keys.filter(inherits);
        const units = (k: HeirKey) => c[k] * (members.length > 1 && FEMALE_KEYS.has(k) ? 1 : members.length > 1 ? 2 : 1);
        const totalUnits = members.reduce((s, k) => s + units(k), 0);
        for (const k of members) {
            const part = mul(residue, frac(units(k), totalUnits));
            final[k] = add(final[k] ?? ZERO, part);
            basis[k] = fard[k] ? 'fard+asaba' : 'asaba';
            if (!fard[k]) {
                reason[k] = members.length > 1
                    ? `Residuary: shares what remains, ${FEMALE_KEYS.has(k) ? 'a female receiving half a male\'s share' : 'a male receiving twice a female\'s share'}`
                    : isZero(residue)
                        ? 'Residuary, but nothing remains after the fixed shares'
                        : (reason[k] ?? `Residuary: takes what remains (${fracToString(residue)})`);
            }
        }
    } else if (cmp(residue, ZERO) > 0) {
        const raddHeirs = (Object.keys(fard) as HeirKey[]).filter((k) => k !== 'husband' && k !== 'wife');
        if (raddHeirs.length > 0) {
            radd = true;
            const raddBase = sum(raddHeirs.map((k) => fard[k]!));
            for (const k of raddHeirs) final[k] = add(fard[k]!, mul(residue, div(fard[k]!, raddBase)));
            if (madhab === 'Shafi' || madhab === 'Maliki') {
                warnings.push(`Radd applied: the surplus is returned to the blood heirs. Classical ${madhab} texts give it to the public treasury (bayt al-mal); later ${madhab} scholars adopted radd where no sound treasury exists.`);
            }
        } else {
            unallocated = residue;
            warnings.push(
                `${fracToString(residue)} of the estate has no heir in this calculator. It would pass to distant kindred (dhawu al-arham)` +
                `${Object.keys(fard).length ? ', or by some modern fatwas back to the spouse' : ''}, otherwise to charity / bayt al-mal. Consult a scholar.`
            );
        }
    }

    // ── 6. Assemble ──
    const shares: HeirShare[] = HEIR_ORDER.filter(has).map((k) => {
        if (blocked[k]) {
            return { key: k, count: c[k], basis: 'blocked', fard: ZERO, share: ZERO, perPerson: ZERO, reason: blocked[k]! };
        }
        const share = final[k] ?? ZERO;
        let why = reason[k] ?? '';
        if (awl && fard[k]) why += ` — reduced proportionally (awl)`;
        if (radd && fard[k] && k !== 'husband' && k !== 'wife') why += ' — plus a proportional return of the surplus (radd)';
        return {
            key: k,
            count: c[k],
            basis: basis[k] ?? 'asaba',
            fard: fard[k] ?? ZERO,
            share,
            perPerson: div(share, frac(c[k])),
            reason: why,
        };
    });

    return { shares, awl, radd, unallocated, warnings };
}

// ─── Estate waterfall ─────────────────────────────────────

export interface EstateWaterfall {
    grossEstate: number;
    funeral: number;
    debtsToPeople: number;
    debtsToAllah: number;       // paid before bequests (non-Hanafi) or from the 1/3 (Hanafi)
    netEstate: number;          // after funeral + debts (+ debts to Allah where applicable)
    bequestCap: number;         // 1/3 of net estate
    bequestsRequested: number;
    bequestsAllowed: number;
    bequestsOverCap: boolean;
    inheritance: number;        // distributed to heirs by faraid
}

export function calculateWaterfall(params: {
    madhab: Madhab;
    grossEstate: number;
    funeral: number;
    debtsToPeople: number;
    debtsToAllah: number;
    bequestsFixed: number;
    bequestsPercent: number;     // sum of percentages (0–100) of net estate
}): EstateWaterfall {
    const { madhab, grossEstate, funeral, debtsToPeople, debtsToAllah, bequestsFixed, bequestsPercent } = params;
    const afterFuneral = Math.max(0, grossEstate - funeral);
    const afterPeople = Math.max(0, afterFuneral - debtsToPeople);

    // Hanafi: debts to Allah lapse at death unless bequeathed — treated as a bequest from the 1/3.
    const hanafi = madhab === 'Hanafi';
    const netEstate = hanafi ? afterPeople : Math.max(0, afterPeople - debtsToAllah);
    const bequestCap = netEstate / 3;
    const bequestsRequested = bequestsFixed + (netEstate * bequestsPercent) / 100 + (hanafi ? debtsToAllah : 0);
    const bequestsAllowed = Math.min(bequestsRequested, bequestCap);

    return {
        grossEstate,
        funeral: Math.min(funeral, grossEstate),
        debtsToPeople: Math.min(debtsToPeople, afterFuneral),
        debtsToAllah,
        netEstate,
        bequestCap,
        bequestsRequested,
        bequestsAllowed,
        bequestsOverCap: bequestsRequested > bequestCap + 0.005,
        inheritance: Math.max(0, netEstate - bequestsAllowed),
    };
}
