/**
 * Spreadsheet layout shared by every spreadsheet-style storage backend.
 *
 * Each tab is a table: one header row, then one record per row. Columns are
 * matched by header text (never by position), so users can reorder columns
 * or add their own without breaking anything. Each column records the header
 * it had in older versions so existing sheets can be upgraded in place.
 *
 * Enum columns store a human-readable label in the sheet (e.g. "Money Owed
 * to You") and map back to the app's internal value (e.g. "Debt_Receivable").
 * Both forms are accepted when reading.
 */

import type {
    Asset,
    DonationEntry,
    DonationPlan,
    HistoryEntry,
    InterestEntry,
    Liability,
    Settings,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

/** Bump when the layout changes; older sheets are upgraded on next load. */
export const SCHEMA_VERSION = 3;

export type ColumnType = 'string' | 'number' | 'money' | 'percent' | 'year' | 'boolean' | 'enum' | 'date';

export interface EnumOption {
    value: string;
    label: string;
}

export interface Column {
    /** Property name on the app record. */
    key: string;
    /** Header text written to the sheet. */
    header: string;
    /** Header text used by earlier versions of the app. */
    legacy?: string[];
    type: ColumnType;
    options?: EnumOption[];
    /** Hidden in the sheet (e.g. internal IDs). */
    hidden?: boolean;
}

export type EntityName = 'settings' | 'assets' | 'liabilities' | 'history' | 'donations' | 'donationPlans' | 'interest';

export interface TabSchema {
    entity: EntityName;
    title: string;
    /** Property used to find a row when updating or deleting. */
    keyField?: string;
    columns: Column[];
}

// ─── Enum options ─────────────────────────────────────────

const opts = (pairs: [string, string][]): EnumOption[] =>
    pairs.map(([value, label]) => ({ value, label }));

export const ASSET_TYPE_OPTIONS = opts([
    ['Cash', 'Cash'],
    ['Bank', 'Bank Account'],
    ['Stock', 'Stocks & Funds'],
    ['Crypto', 'Crypto'],
    ['Retirement', 'Retirement Account'],
    ['Gold', 'Gold'],
    ['Silver', 'Silver'],
    ['Merchandise', 'Business Inventory'],
    ['Debt_Receivable', 'Money Owed to You'],
]);

const ZAKAT_METHOD_OPTIONS = opts([
    ['Market', 'Full Market Value'],
    ['Passive_Proxy', '30% Proxy'],
    ['Manual', 'Manual %'],
    ['Commodity_ETF', 'Commodity ETF'],
]);

const STOCK_HOLDING_OPTIONS = opts([
    ['Short_Term', 'Trading (short-term)'],
    ['Long_Term', 'Investing (long-term)'],
]);

const RETIREMENT_TYPE_OPTIONS = opts([
    ['Mandatory', 'Mandatory (pension)'],
    ['Voluntary', 'Voluntary (401k, IRA, etc.)'],
]);

const RETIREMENT_ACCOUNT_OPTIONS = opts([
    ['Taxable_401k', '401(k) / IRA (taxable)'],
    ['Taxable_RRSP', 'RRSP (taxable)'],
    ['NonTaxable_Roth', 'Roth'],
    ['NonTaxable_TFSA', 'TFSA'],
    ['NonTaxable_Brokerage', 'Brokerage'],
]);

const CRYPTO_INTENT_OPTIONS = opts([
    ['Currency', 'Held as currency'],
    ['Resale', 'Held for resale'],
    ['Platform_Token', 'Platform token'],
]);

const DEBT_STRENGTH_OPTIONS = opts([
    ['Strong', 'Strong'],
    ['Intermediate', 'Intermediate'],
    ['Weak', 'Weak'],
]);

const WEIGHT_UNIT_OPTIONS = opts([
    ['grams', 'Grams'],
    ['troy_oz', 'Troy oz'],
    ['tola', 'Tola'],
]);

export const LIABILITY_TYPE_OPTIONS = opts([
    ['Mortgage', 'Mortgage'],
    ['Utility_Bills', 'Utility Bills'],
    ['Medical_Bills', 'Medical Bills'],
    ['Credit_Balance', 'Credit Card / Credit'],
    ['Personal_Loan', 'Personal Loan'],
    ['Student_Loan', 'Student Loan'],
    ['Commercial_Loan', 'Business Loan'],
    ['Dowry', 'Dowry (Mahr)'],
    ['Salary_Service_Fee', 'Wages / Service Fees'],
    ['Other', 'Other'],
]);

const MADHAB_OPTIONS = opts([
    ['Hanafi', 'Hanafi'],
    ['Shafi', "Shafi'i"],
    ['Maliki', 'Maliki'],
    ['Hanbali', 'Hanbali'],
]);

const NISAB_OPTIONS = opts([
    ['Gold', 'Gold'],
    ['Silver', 'Silver'],
]);

const CALC_BASIS_OPTIONS = opts([
    ['Hijri', 'Hijri (lunar)'],
    ['Gregorian', 'Gregorian (solar)'],
]);

const DONATION_CATEGORY_OPTIONS = opts([
    ['Zakat', 'Zakat'],
    ['Sadaqah', 'Sadaqah'],
    ['Interest', 'Interest Given Away'],
    ['Other', 'Other'],
]);

const PLAN_CATEGORY_OPTIONS = DONATION_CATEGORY_OPTIONS.filter((o) => o.value !== 'Other');

const PLAN_FREQUENCY_OPTIONS = opts([
    ['once', 'One payment'],
    ['weekly', 'Weekly'],
    ['biweekly', 'Every 2 weeks'],
    ['semimonthly', 'Twice a month'],
    ['monthly', 'Monthly'],
    ['quarterly', 'Every 3 months'],
]);

const PLAN_STATUS_OPTIONS = opts([
    ['active', 'Active'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
]);

const INTEREST_PERIOD_OPTIONS = opts([
    ['month', 'Month'],
    ['year', 'Year'],
    ['other', 'Other'],
]);

// ─── Tabs ─────────────────────────────────────────────────

export const SUMMARY_TITLE = 'Summary';

export const SETTINGS_TAB: TabSchema = {
    entity: 'settings',
    title: 'Settings',
    columns: [
        { key: 'madhab', header: 'Madhab', type: 'enum', options: MADHAB_OPTIONS },
        { key: 'nisabStandard', header: 'Nisab Standard', legacy: ['Nisab_Standard'], type: 'enum', options: NISAB_OPTIONS },
        { key: 'calculationBasis', header: 'Calendar', legacy: ['Calculation_Basis'], type: 'enum', options: CALC_BASIS_OPTIONS },
        { key: 'baseCurrency', header: 'Base Currency', legacy: ['Base_Currency'], type: 'string' },
        { key: 'anniversaryHijri', header: 'Zakat Anniversary (Hijri month-day)', legacy: ['Anniversary_Hijri'], type: 'string' },
        { key: 'incomeLevel', header: 'Annual Income', legacy: ['Income_Level'], type: 'money' },
        { key: 'stateProvince', header: 'State / Province', legacy: ['State_Province'], type: 'string' },
        { key: 'isUnderRetirementAge', header: 'Under Retirement Age', legacy: ['Under_Retirement_Age'], type: 'boolean' },
    ],
};

export const ASSETS_TAB: TabSchema = {
    entity: 'assets',
    title: 'Assets',
    keyField: 'id',
    columns: [
        { key: 'id', header: 'ID', type: 'string', hidden: true },
        { key: 'zakatYear', header: 'Zakat Year', legacy: ['Zakat_Year'], type: 'year' },
        { key: 'type', header: 'Type', type: 'enum', options: ASSET_TYPE_OPTIONS },
        { key: 'name', header: 'Name', type: 'string' },
        { key: 'currency', header: 'Currency', type: 'string' },
        { key: 'grossValue', header: 'Value', legacy: ['Gross_Value'], type: 'money' },
        { key: 'zakatMethod', header: 'Zakat Method', legacy: ['Zakat_Method'], type: 'enum', options: ZAKAT_METHOD_OPTIONS },
        { key: 'valuationPercent', header: 'Valuation %', legacy: ['Valuation_Percent'], type: 'percent' },
        { key: 'stockHoldingType', header: 'Stock Holding', legacy: ['Stock_Holding_Type'], type: 'enum', options: STOCK_HOLDING_OPTIONS },
        { key: 'zakatableAssetPercent', header: 'Zakatable %', legacy: ['Zakatable_Asset_Percent'], type: 'percent' },
        { key: 'retirementType', header: 'Retirement Type', legacy: ['Retirement_Type'], type: 'enum', options: RETIREMENT_TYPE_OPTIONS },
        { key: 'cryptoIntent', header: 'Crypto Intent', legacy: ['Crypto_Intent'], type: 'enum', options: CRYPTO_INTENT_OPTIONS },
        { key: 'debtStrength', header: 'Debt Strength', legacy: ['Debt_Strength'], type: 'enum', options: DEBT_STRENGTH_OPTIONS },
        { key: 'ticker', header: 'Ticker', type: 'string' },
        { key: 'quantity', header: 'Quantity', type: 'number' },
        { key: 'goldPurity', header: 'Purity (karat)', legacy: ['Gold_Purity'], type: 'number' },
        { key: 'weightGrams', header: 'Weight (grams)', legacy: ['Weight_Grams'], type: 'number' },
        { key: 'weightUnit', header: 'Weight Unit', legacy: ['Weight_Unit'], type: 'enum', options: WEIGHT_UNIT_OPTIONS },
        { key: 'isJewelry', header: 'Jewelry', legacy: ['Is_Jewelry'], type: 'boolean' },
        { key: 'isETF', header: 'ETF', legacy: ['Is_ETF'], type: 'boolean' },
        { key: 'deductibleTaxPenalty', header: 'Not Zakatable (base currency)', legacy: ['Deductible_Tax_Penalty'], type: 'money' },
        { key: 'netZakatableValue', header: 'Zakatable (base currency)', legacy: ['Net_Zakatable_Value'], type: 'money' },
        { key: 'retirementAccountType', header: 'Retirement Account', legacy: ['Retirement_Account_Type'], type: 'enum', options: RETIREMENT_ACCOUNT_OPTIONS },
        { key: 'earnsInterest', header: 'Earns Interest', type: 'boolean' },
    ],
};

export const LIABILITIES_TAB: TabSchema = {
    entity: 'liabilities',
    title: 'Liabilities',
    keyField: 'id',
    columns: [
        { key: 'id', header: 'ID', type: 'string', hidden: true },
        { key: 'zakatYear', header: 'Zakat Year', legacy: ['Zakat_Year'], type: 'year' },
        { key: 'type', header: 'Type', type: 'enum', options: LIABILITY_TYPE_OPTIONS },
        { key: 'name', header: 'Name', type: 'string' },
        { key: 'currency', header: 'Currency', type: 'string' },
        { key: 'totalAmount', header: 'Total Owed', legacy: ['Total_Amount'], type: 'money' },
        { key: 'monthlyPayment', header: 'Monthly Payment', legacy: ['Monthly_Payment'], type: 'money' },
        { key: 'isImmediate', header: 'Due Now', legacy: ['Is_Immediate'], type: 'boolean' },
    ],
};

export const HISTORY_TAB: TabSchema = {
    entity: 'history',
    title: 'History',
    keyField: 'year',
    columns: [
        { key: 'year', header: 'Zakat Year', legacy: ['Year'], type: 'year' },
        { key: 'dateFinalized', header: 'Date Finalized', legacy: ['Date_Finalized'], type: 'date' },
        { key: 'totalAssets', header: 'Total Assets', legacy: ['Total_Assets'], type: 'money' },
        { key: 'totalLiabilities', header: 'Total Debts', legacy: ['Total_Liabilities'], type: 'money' },
        { key: 'netZakatable', header: 'Net Zakatable', legacy: ['Net_Zakatable'], type: 'money' },
        { key: 'nisabThresholdUsed', header: 'Nisab Used', legacy: ['Nisab_Threshold_Used'], type: 'money' },
        { key: 'zakatPaid', header: 'Zakat Paid', legacy: ['Zakat_Paid'], type: 'money' },
        { key: 'recipientsList', header: 'Recipients', legacy: ['Recipients_List'], type: 'string' },
    ],
};

export const DONATIONS_TAB: TabSchema = {
    entity: 'donations',
    title: 'Donations',
    keyField: 'id',
    columns: [
        { key: 'id', header: 'ID', type: 'string', hidden: true },
        { key: 'zakatYear', header: 'Zakat Year', legacy: ['Zakat_Year'], type: 'year' },
        { key: 'date', header: 'Date', type: 'date' },
        { key: 'category', header: 'Category', type: 'enum', options: DONATION_CATEGORY_OPTIONS },
        { key: 'amount', header: 'Amount', type: 'money' },
        { key: 'recipient', header: 'Recipient', type: 'string' },
        { key: 'notes', header: 'Notes', type: 'string' },
        // One payment split across recipients shares a Payment ID; plan instalments carry the Plan ID.
        { key: 'paymentId', header: 'Payment ID', type: 'string', hidden: true },
        { key: 'planId', header: 'Plan ID', type: 'string', hidden: true },
    ],
};

export const DONATION_PLANS_TAB: TabSchema = {
    entity: 'donationPlans',
    title: 'Donation Plans',
    keyField: 'id',
    columns: [
        { key: 'id', header: 'ID', type: 'string', hidden: true },
        { key: 'zakatYear', header: 'Zakat Year', type: 'year' },
        { key: 'category', header: 'Category', type: 'enum', options: PLAN_CATEGORY_OPTIONS },
        { key: 'totalAmount', header: 'Total', type: 'money' },
        { key: 'frequency', header: 'How Often', type: 'enum', options: PLAN_FREQUENCY_OPTIONS },
        { key: 'startDate', header: 'First Payment', type: 'date' },
        { key: 'numberOfPayments', header: 'Number of Payments', type: 'number' },
        { key: 'status', header: 'Status', type: 'enum', options: PLAN_STATUS_OPTIONS },
        { key: 'notes', header: 'Notes', type: 'string' },
    ],
};

export const INTEREST_TAB: TabSchema = {
    entity: 'interest',
    title: 'Interest',
    keyField: 'id',
    columns: [
        { key: 'id', header: 'ID', type: 'string', hidden: true },
        { key: 'zakatYear', header: 'Zakat Year', type: 'year' },
        { key: 'date', header: 'Date', type: 'date' },
        { key: 'accountName', header: 'Account', type: 'string' },
        { key: 'currency', header: 'Currency', type: 'string' },
        { key: 'amount', header: 'Interest Earned', type: 'money' },
        { key: 'period', header: 'Period', type: 'enum', options: INTEREST_PERIOD_OPTIONS },
        { key: 'notes', header: 'Notes', type: 'string' },
        { key: 'assetId', header: 'Asset ID', type: 'string', hidden: true },
    ],
};

/** Data tabs in display order (the Summary tab comes first and is separate). */
export const DATA_TABS: TabSchema[] = [
    ASSETS_TAB,
    LIABILITIES_TAB,
    DONATIONS_TAB,
    DONATION_PLANS_TAB,
    INTEREST_TAB,
    HISTORY_TAB,
    SETTINGS_TAB,
];

export function tabFor(entity: EntityName): TabSchema {
    const tab = DATA_TABS.find((t) => t.entity === entity);
    if (!tab) throw new Error(`Unknown entity: ${entity}`);
    return tab;
}

// ─── Cell values ──────────────────────────────────────────

/** A raw cell value as read from or written to a sheet. */
export type CellValue = string | number | boolean | null;

/** Header-cell text → column, accepting current and legacy headers. */
export function columnForHeader(tab: TabSchema, header: CellValue): Column | undefined {
    const text = String(header ?? '').trim();
    if (!text) return undefined;
    return tab.columns.find((c) => c.header === text || c.legacy?.includes(text));
}

export function parseCell(column: Column, raw: CellValue): unknown {
    if (raw === null || raw === undefined) return undefined;
    const text = typeof raw === 'string' ? raw.trim() : raw;
    if (text === '') return undefined;

    switch (column.type) {
        case 'string':
            return String(text);
        case 'date':
            if (typeof text === 'number') {
                // A date typed into the sheet comes back as a serial day number.
                return new Date(Date.UTC(1899, 11, 30) + text * 86_400_000).toISOString().slice(0, 10);
            }
            return String(text);
        case 'number':
        case 'money':
        case 'percent': {
            const n = typeof text === 'number' ? text : Number(String(text).replace(/[,\s]/g, ''));
            return Number.isFinite(n) ? n : undefined;
        }
        case 'year': {
            const n = Number(text);
            return Number.isFinite(n) ? String(Math.trunc(n)) : String(text);
        }
        case 'boolean':
            if (typeof text === 'boolean') return text;
            return String(text).toLowerCase() === 'true';
        case 'enum': {
            const s = String(text).toLowerCase();
            const match = column.options?.find(
                (o) => o.value.toLowerCase() === s || o.label.toLowerCase() === s
            );
            return match?.value;
        }
    }
}

/** App value → sheet value. Empty cells are represented as null. */
export function serializeCell(column: Column, value: unknown): CellValue {
    if (value === undefined || value === null || value === '') return null;

    switch (column.type) {
        case 'string':
        case 'date':
            return String(value);
        case 'number':
        case 'money':
        case 'percent': {
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
        }
        case 'year': {
            const n = Number(value);
            return Number.isFinite(n) ? n : String(value);
        }
        case 'boolean':
            return Boolean(value);
        case 'enum': {
            const option = column.options?.find((o) => o.value === value);
            return option ? option.label : String(value);
        }
    }
}

// ─── Rows ⇄ records ───────────────────────────────────────

export interface HeaderMap {
    /** Header cells exactly as they appear in the sheet. */
    headers: string[];
    /** Column index in the sheet for each known column key. */
    indexByKey: Record<string, number>;
}

export function mapHeaders(tab: TabSchema, headerRow: CellValue[]): HeaderMap {
    const headers = headerRow.map((h) => String(h ?? '').trim());
    const indexByKey: Record<string, number> = {};
    headers.forEach((h, i) => {
        const column = columnForHeader(tab, h);
        if (column && indexByKey[column.key] === undefined) indexByKey[column.key] = i;
    });
    return { headers, indexByKey };
}

export function rowToRecord(tab: TabSchema, map: HeaderMap, row: CellValue[]): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    for (const column of tab.columns) {
        const index = map.indexByKey[column.key];
        if (index === undefined) continue;
        const value = parseCell(column, row[index] ?? null);
        if (value !== undefined) record[column.key] = value;
    }
    return record;
}

/**
 * Build a full sheet row for a record. Cells in columns the app doesn't know
 * about (added by the user) are kept from `existing`.
 */
export function recordToRow(
    tab: TabSchema,
    map: HeaderMap,
    record: Record<string, unknown>,
    existing: CellValue[] = []
): CellValue[] {
    const row: CellValue[] = map.headers.map((_, i) => existing[i] ?? null);
    for (const column of tab.columns) {
        const index = map.indexByKey[column.key];
        if (index === undefined) continue;
        row[index] = serializeCell(column, record[column.key]);
    }
    // Trim trailing empties so we don't write past the user's data.
    while (row.length > 0 && row[row.length - 1] === null) row.pop();
    return row;
}

export function isBlankRow(row: CellValue[]): boolean {
    return row.every((c) => c === null || c === undefined || String(c).trim() === '');
}

// ─── Records → app types (with defaults) ──────────────────

const thisYear = () => new Date().getFullYear().toString();

export function toSettings(record: Record<string, unknown> | undefined): Settings {
    const r = record ?? {};
    return {
        madhab: (r.madhab as Settings['madhab']) ?? DEFAULT_SETTINGS.madhab,
        nisabStandard: (r.nisabStandard as Settings['nisabStandard']) ?? DEFAULT_SETTINGS.nisabStandard,
        calculationBasis: (r.calculationBasis as Settings['calculationBasis']) ?? DEFAULT_SETTINGS.calculationBasis,
        baseCurrency: (r.baseCurrency as string) ?? DEFAULT_SETTINGS.baseCurrency,
        anniversaryHijri: r.anniversaryHijri as string | undefined,
        incomeLevel: r.incomeLevel as number | undefined,
        stateProvince: r.stateProvince as string | undefined,
        isUnderRetirementAge:
            (r.isUnderRetirementAge as boolean | undefined) ?? DEFAULT_SETTINGS.isUnderRetirementAge,
    };
}

export function toAsset(r: Record<string, unknown>): Asset {
    return {
        ...(r as Partial<Asset>),
        id: r.id as string,
        zakatYear: (r.zakatYear as string) ?? thisYear(),
        type: (r.type as Asset['type']) ?? 'Cash',
        name: (r.name as string) ?? '',
        currency: (r.currency as string) ?? 'USD',
        grossValue: (r.grossValue as number) ?? 0,
        zakatMethod: (r.zakatMethod as Asset['zakatMethod']) ?? 'Market',
        valuationPercent: (r.valuationPercent as number) ?? 100,
        isJewelry: (r.isJewelry as boolean) ?? false,
        isETF: (r.isETF as boolean) ?? false,
        deductibleTaxPenalty: (r.deductibleTaxPenalty as number) ?? 0,
        netZakatableValue: (r.netZakatableValue as number) ?? 0,
    };
}

export function toLiability(r: Record<string, unknown>): Liability {
    return {
        id: r.id as string,
        zakatYear: (r.zakatYear as string) ?? thisYear(),
        type: (r.type as Liability['type']) ?? 'Other',
        name: (r.name as string) ?? '',
        currency: (r.currency as string) ?? 'USD',
        totalAmount: (r.totalAmount as number) ?? 0,
        monthlyPayment: (r.monthlyPayment as number) ?? 0,
        isImmediate: (r.isImmediate as boolean) ?? false,
    };
}

export function toHistoryEntry(r: Record<string, unknown>): HistoryEntry {
    return {
        year: (r.year as string) ?? '',
        dateFinalized: (r.dateFinalized as string) ?? '',
        totalAssets: (r.totalAssets as number) ?? 0,
        totalLiabilities: (r.totalLiabilities as number) ?? 0,
        netZakatable: (r.netZakatable as number) ?? 0,
        nisabThresholdUsed: (r.nisabThresholdUsed as number) ?? 0,
        zakatPaid: (r.zakatPaid as number) ?? 0,
        recipientsList: (r.recipientsList as string) ?? '',
    };
}

export function toDonation(r: Record<string, unknown>): DonationEntry {
    return {
        id: r.id as string,
        zakatYear: r.zakatYear as string | undefined,
        date: (r.date as string) ?? '',
        amount: (r.amount as number) ?? 0,
        recipient: (r.recipient as string) ?? '',
        notes: (r.notes as string) ?? '',
        category: (r.category as DonationEntry['category']) ?? 'Other',
        paymentId: r.paymentId as string | undefined,
        planId: r.planId as string | undefined,
    };
}

export function toDonationPlan(r: Record<string, unknown>): DonationPlan {
    const frequency = (r.frequency as DonationPlan['frequency']) ?? 'monthly';
    return {
        id: r.id as string,
        zakatYear: (r.zakatYear as string) ?? thisYear(),
        category: (r.category as DonationPlan['category']) ?? 'Zakat',
        totalAmount: (r.totalAmount as number) ?? 0,
        frequency,
        startDate: (r.startDate as string) ?? '',
        numberOfPayments: frequency === 'once' ? 1 : Math.max(1, Math.round((r.numberOfPayments as number) ?? 1)),
        status: (r.status as DonationPlan['status']) ?? 'active',
        notes: (r.notes as string) ?? '',
    };
}

export function toInterestEntry(r: Record<string, unknown>): InterestEntry {
    return {
        id: r.id as string,
        zakatYear: (r.zakatYear as string) ?? thisYear(),
        date: (r.date as string) ?? '',
        assetId: r.assetId as string | undefined,
        accountName: (r.accountName as string) ?? '',
        currency: (r.currency as string) ?? 'USD',
        amount: (r.amount as number) ?? 0,
        period: (r.period as InterestEntry['period']) ?? 'other',
        notes: (r.notes as string) ?? '',
    };
}
