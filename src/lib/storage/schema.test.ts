import { describe, it, expect } from 'vitest';
import {
    ASSETS_TAB,
    SETTINGS_TAB,
    DONATIONS_TAB,
    mapHeaders,
    parseCell,
    recordToRow,
    rowToRecord,
    serializeCell,
    toAsset,
    toSettings,
} from './schema';

const col = (key: string) => ASSETS_TAB.columns.find((c) => c.key === key)!;

describe('cell conversion', () => {
    it('writes enum labels and reads back labels or internal values', () => {
        expect(serializeCell(col('type'), 'Debt_Receivable')).toBe('Money Owed to You');
        expect(parseCell(col('type'), 'Money Owed to You')).toBe('Debt_Receivable');
        expect(parseCell(col('type'), 'debt_receivable')).toBe('Debt_Receivable');
        expect(parseCell(col('type'), 'nonsense')).toBeUndefined();
    });

    it('reads booleans stored as text by the old version', () => {
        expect(parseCell(col('isJewelry'), 'true')).toBe(true);
        expect(parseCell(col('isJewelry'), 'FALSE')).toBe(false);
        expect(parseCell(col('isJewelry'), true)).toBe(true);
        expect(serializeCell(col('isJewelry'), true)).toBe(true);
    });

    it('stores years as numbers but reads them back as strings', () => {
        expect(serializeCell(col('zakatYear'), '2025')).toBe(2025);
        expect(parseCell(col('zakatYear'), 2025)).toBe('2025');
    });

    it('reads numbers typed with thousands separators', () => {
        expect(parseCell(col('grossValue'), '12,500.50')).toBe(12500.5);
        expect(parseCell(col('grossValue'), 'abc')).toBeUndefined();
    });

    it('converts a date typed into the sheet back to ISO', () => {
        const dateCol = DONATIONS_TAB.columns.find((c) => c.key === 'date')!;
        expect(parseCell(dateCol, 46000)).toBe('2025-12-09');
        expect(parseCell(dateCol, '2026-03-01')).toBe('2026-03-01');
    });

    it('treats empty cells as missing', () => {
        expect(parseCell(col('name'), '')).toBeUndefined();
        expect(serializeCell(col('ticker'), undefined)).toBeNull();
    });
});

describe('rows and records', () => {
    it('reads a row written with the old headers', () => {
        const legacyHeaders = ['ID', 'Zakat_Year', 'Type', 'Name', 'Currency', 'Gross_Value', 'Is_Jewelry'];
        const map = mapHeaders(ASSETS_TAB, legacyHeaders);
        const record = rowToRecord(ASSETS_TAB, map, ['a1', '2025', 'Gold', 'Ring', 'USD', 1200, 'true']);
        expect(record).toMatchObject({
            id: 'a1', zakatYear: '2025', type: 'Gold', name: 'Ring', currency: 'USD', grossValue: 1200, isJewelry: true,
        });
    });

    it('finds columns by name even when the user reorders them', () => {
        const map = mapHeaders(ASSETS_TAB, ['Name', 'My notes', 'ID', 'Value']);
        const record = rowToRecord(ASSETS_TAB, map, ['Savings', 'ignore me', 'x', 50]);
        expect(record).toEqual({ name: 'Savings', id: 'x', grossValue: 50 });
    });

    it('keeps the user’s own columns when building a row', () => {
        const map = mapHeaders(ASSETS_TAB, ['ID', 'My notes', 'Name']);
        const row = recordToRow(ASSETS_TAB, map, { id: 'x', name: 'New name' }, ['x', 'keep', 'Old']);
        expect(row).toEqual(['x', 'keep', 'New name']);
    });

    it('fills in defaults for missing asset fields', () => {
        const asset = toAsset({ id: 'x' });
        expect(asset).toMatchObject({ type: 'Cash', currency: 'USD', grossValue: 0, valuationPercent: 100 });
    });

    it('fills in default settings and keeps saved ones', () => {
        expect(toSettings(undefined).madhab).toBe('Hanafi');
        const map = mapHeaders(SETTINGS_TAB, SETTINGS_TAB.columns.map((c) => c.header));
        const row = recordToRow(SETTINGS_TAB, map, { madhab: 'Shafi', anniversaryHijri: '9-1', isUnderRetirementAge: false });
        const settings = toSettings(rowToRecord(SETTINGS_TAB, map, row));
        expect(settings).toMatchObject({ madhab: 'Shafi', anniversaryHijri: '9-1', isUnderRetirementAge: false, baseCurrency: 'USD' });
    });
});
