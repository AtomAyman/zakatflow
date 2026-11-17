// ─── Wasiyyah (Islamic Will) Types ────────────────────────
// Kept separate from ./types so the Zakat model stays untouched.

export type Gender = 'male' | 'female';

/** Every relation the faraid engine understands. */
export type HeirKey =
    | 'husband'
    | 'wife'
    | 'father'
    | 'mother'
    | 'paternalGrandfather'
    | 'maternalGrandmother'
    | 'paternalGrandmother'
    | 'son'
    | 'daughter'
    | 'sonsSon'
    | 'sonsDaughter'
    | 'fullBrother'
    | 'fullSister'
    | 'paternalBrother'
    | 'paternalSister'
    | 'maternalBrother'
    | 'maternalSister'
    | 'fullBrothersSon'
    | 'paternalBrothersSon'
    | 'fullPaternalUncle'
    | 'paternalPaternalUncle'
    | 'fullPaternalUnclesSon'
    | 'paternalPaternalUnclesSon';

export type HeirCounts = Partial<Record<HeirKey, number>>;

export interface HeirMeta {
    label: string;
    plural: string;
    arabic: string;
    group: 'Spouse' | 'Parents & Grandparents' | 'Children & Grandchildren' | 'Siblings' | 'Extended';
    max?: number;              // e.g. 1 father, 4 wives
    onlyIf?: Gender;           // gender of the deceased this relation applies to
}

export const HEIR_META: Record<HeirKey, HeirMeta> = {
    husband: { label: 'Husband', plural: 'Husband', arabic: 'زوج', group: 'Spouse', max: 1, onlyIf: 'female' },
    wife: { label: 'Wife', plural: 'Wives', arabic: 'زوجة', group: 'Spouse', max: 4, onlyIf: 'male' },
    father: { label: 'Father', plural: 'Father', arabic: 'أب', group: 'Parents & Grandparents', max: 1 },
    mother: { label: 'Mother', plural: 'Mother', arabic: 'أم', group: 'Parents & Grandparents', max: 1 },
    paternalGrandfather: { label: "Paternal grandfather (father's father)", plural: 'Paternal grandfather', arabic: 'جد', group: 'Parents & Grandparents', max: 1 },
    maternalGrandmother: { label: "Maternal grandmother (mother's mother)", plural: 'Maternal grandmother', arabic: 'جدة لأم', group: 'Parents & Grandparents', max: 1 },
    paternalGrandmother: { label: "Paternal grandmother (father's mother)", plural: 'Paternal grandmother', arabic: 'جدة لأب', group: 'Parents & Grandparents', max: 1 },
    son: { label: 'Son', plural: 'Sons', arabic: 'ابن', group: 'Children & Grandchildren' },
    daughter: { label: 'Daughter', plural: 'Daughters', arabic: 'بنت', group: 'Children & Grandchildren' },
    sonsSon: { label: "Son's son", plural: "Son's sons", arabic: 'ابن ابن', group: 'Children & Grandchildren' },
    sonsDaughter: { label: "Son's daughter", plural: "Son's daughters", arabic: 'بنت ابن', group: 'Children & Grandchildren' },
    fullBrother: { label: 'Full brother', plural: 'Full brothers', arabic: 'أخ شقيق', group: 'Siblings' },
    fullSister: { label: 'Full sister', plural: 'Full sisters', arabic: 'أخت شقيقة', group: 'Siblings' },
    paternalBrother: { label: 'Paternal half-brother (same father)', plural: 'Paternal half-brothers', arabic: 'أخ لأب', group: 'Siblings' },
    paternalSister: { label: 'Paternal half-sister (same father)', plural: 'Paternal half-sisters', arabic: 'أخت لأب', group: 'Siblings' },
    maternalBrother: { label: 'Maternal half-brother (same mother)', plural: 'Maternal half-brothers', arabic: 'أخ لأم', group: 'Siblings' },
    maternalSister: { label: 'Maternal half-sister (same mother)', plural: 'Maternal half-sisters', arabic: 'أخت لأم', group: 'Siblings' },
    fullBrothersSon: { label: "Full brother's son", plural: "Full brother's sons", arabic: 'ابن أخ شقيق', group: 'Extended' },
    paternalBrothersSon: { label: "Paternal half-brother's son", plural: "Paternal half-brother's sons", arabic: 'ابن أخ لأب', group: 'Extended' },
    fullPaternalUncle: { label: "Full paternal uncle (father's full brother)", plural: 'Full paternal uncles', arabic: 'عم شقيق', group: 'Extended' },
    paternalPaternalUncle: { label: "Paternal uncle (father's paternal half-brother)", plural: 'Paternal half-uncles', arabic: 'عم لأب', group: 'Extended' },
    fullPaternalUnclesSon: { label: "Full paternal uncle's son", plural: "Full paternal uncle's sons", arabic: 'ابن عم شقيق', group: 'Extended' },
    paternalPaternalUnclesSon: { label: "Paternal half-uncle's son", plural: "Paternal half-uncle's sons", arabic: 'ابن عم لأب', group: 'Extended' },
};

export const HEIR_ORDER = Object.keys(HEIR_META) as HeirKey[];

// ─── Document sections ────────────────────────────────────

export interface Testator {
    fullName: string;
    gender: Gender;
    dateOfBirth?: string;
    address?: string;
    jurisdiction?: string; // e.g. "Ontario, Canada"
}

export interface Relative {
    id: string;
    name: string;
    relation: HeirKey;
    notes?: string;
    isMinor?: boolean;
}

export type EstateItemCategory =
    | 'Real_Estate'
    | 'Vehicle'
    | 'Business'
    | 'Life_Insurance'
    | 'Personal_Effects'
    | 'Receivable'
    | 'Other';

export interface EstateItem {
    id: string;
    name: string;
    category: EstateItemCategory;
    value: number;
    currency: string;
    notes?: string;
}

export type EstateDebtKind =
    | 'Creditor'      // owed to a person / institution
    | 'Deferred_Mahr' // unpaid dowry to wife
    | 'Zakat'         // unpaid zakat
    | 'Kaffarah'
    | 'Fidya'         // missed fasts / prayers
    | 'Hajj'          // obligatory hajj not performed (hajj badal)
    | 'Other';

export const DEBTS_TO_ALLAH: EstateDebtKind[] = ['Zakat', 'Kaffarah', 'Fidya', 'Hajj'];

export interface EstateDebt {
    id: string;
    kind: EstateDebtKind;
    creditor: string;
    amount: number;
    currency: string;
    notes?: string;
}

export type BequestBeneficiaryKind = 'Charity' | 'Waqf' | 'Person' | 'Other';

export interface Bequest {
    id: string;
    beneficiary: string;
    kind: BequestBeneficiaryKind;
    amountType: 'fixed' | 'percent'; // percent of net estate (after funeral + debts)
    value: number;
    currency: string;
    notes?: string;
}

export interface Contact {
    id: string;
    name: string;
    relation?: string;
    contact?: string; // phone / email / address
}

export interface FuneralWishes {
    estimatedCost: number;
    currency: string;
    burialLocation?: string;
    wishes?: string;
}

export interface WasiyyahData {
    testator: Testator;
    relatives: Relative[];
    estateItems: EstateItem[];
    includeZakatAssets: boolean;
    includeLiabilities: boolean;
    debts: EstateDebt[];
    funeral: FuneralWishes;
    bequests: Bequest[];
    executors: Contact[];
    guardians: Contact[];
    witnesses: Contact[];
    personalMessage: string;
    updatedAt: string;
}

export const DEFAULT_WASIYYAH: WasiyyahData = {
    testator: { fullName: '', gender: 'male' },
    relatives: [],
    estateItems: [],
    includeZakatAssets: true,
    includeLiabilities: true,
    debts: [],
    funeral: { estimatedCost: 0, currency: 'USD' },
    bequests: [],
    executors: [],
    guardians: [],
    witnesses: [],
    personalMessage: '',
    updatedAt: '',
};

/** Sheet row keys — one row per section in the "Wasiyyah" tab. */
export const WASIYYAH_KEYS = Object.keys(DEFAULT_WASIYYAH) as (keyof WasiyyahData)[];
