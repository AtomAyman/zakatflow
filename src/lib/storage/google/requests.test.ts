import { describe, it, expect } from 'vitest';
import {
    ASSETS_TAB,
    DONATIONS_TAB,
    HISTORY_TAB,
    SETTINGS_TAB,
    mapHeaders,
    type CellValue,
} from '../schema';
import {
    buildChangeRequests,
    buildSummaryRequest,
    buildTabFormatRequests,
    hasAllColumns,
    hasLegacyHeaders,
    normalizeRows,
    planHeaders,
    toCellData,
    type TabState,
} from './requests';
import type { Asset } from '../../types';

const headersOf = (tab: typeof ASSETS_TAB) => tab.columns.map((c) => c.header);

function state(tab: typeof ASSETS_TAB, sheetId: number, rows: CellValue[][], headers = headersOf(tab)): TabState {
    return { sheetId, map: mapHeaders(tab, headers), rows };
}

const asset = (id: string, name: string): Asset => ({
    id, zakatYear: '2026', type: 'Cash', name, currency: 'USD', grossValue: 100,
    zakatMethod: 'Market', valuationPercent: 100, deductibleTaxPenalty: 0, netZakatableValue: 100,
});

describe('planHeaders (upgrading old sheets)', () => {
    it('renames old headers in place and appends missing columns', () => {
        const plan = planHeaders(ASSETS_TAB, ['ID', 'Zakat_Year', 'Gross_Value', 'My column']);
        expect(plan.headers.slice(0, 4)).toEqual(['ID', 'Zakat Year', 'Value', 'My column']);
        expect(plan.headers).toContain('Retirement Account');
        expect(plan.headers).toHaveLength(ASSETS_TAB.columns.length + 1);
        expect(plan.changed).toBe(true);
    });

    it('does nothing to an up-to-date header row', () => {
        const plan = planHeaders(ASSETS_TAB, headersOf(ASSETS_TAB));
        expect(plan.changed).toBe(false);
        expect(plan.headers).toEqual(headersOf(ASSETS_TAB));
    });

    it('detects legacy and missing headers', () => {
        expect(hasLegacyHeaders(ASSETS_TAB, ['ID', 'Gross_Value'])).toBe(true);
        expect(hasLegacyHeaders(ASSETS_TAB, headersOf(ASSETS_TAB))).toBe(false);
        expect(hasAllColumns(ASSETS_TAB, ['ID', 'Name'])).toBe(false);
        expect(hasAllColumns(ASSETS_TAB, headersOf(ASSETS_TAB))).toBe(true);
    });
});

describe('normalizeRows', () => {
    it('converts old text values, fills missing IDs and years, and keeps user columns', () => {
        const headers = ['ID', 'Zakat Year', 'Type', 'Jewelry', 'My column'];
        const map = mapHeaders(ASSETS_TAB, headers);
        const rows: CellValue[][] = [
            ['', '', 'Debt_Receivable', 'true', 'mine'],
            [null, null, null, null, null],
        ];
        const result = normalizeRows(ASSETS_TAB, map, rows, () => 'new-id');
        expect(result.rowsFixed).toBe(1);
        expect(result.rows[0][0]).toBe('new-id');
        expect(typeof result.rows[0][1]).toBe('number');
        expect(result.rows[0][2]).toBe('Money Owed to You');
        expect(result.rows[0][3]).toBe(true);
        expect(result.rows[0][4]).toBe('mine');
        expect(result.rows[1]).toEqual([null, null, null, null, null]);
    });
});

describe('buildChangeRequests', () => {
    const assets = state(ASSETS_TAB, 11, [
        ['a1', 2026, 'Cash', 'Wallet'],
        ['a2', 2026, 'Cash', 'Savings'],
        ['a3', 2026, 'Cash', 'Old'],
    ]);

    it('updates an existing row in place', () => {
        const [req] = buildChangeRequests([{ entity: 'assets', action: 'upsert', record: asset('a2', 'Renamed') }], { assets });
        expect(req.updateCells.start).toEqual({ sheetId: 11, rowIndex: 2, columnIndex: 0 });
        expect(req.updateCells.rows[0].values[3]).toEqual({ userEnteredValue: { stringValue: 'Renamed' } });
    });

    it('appends a new record', () => {
        const [req] = buildChangeRequests([{ entity: 'assets', action: 'upsert', record: asset('new', 'Gold') }], { assets });
        expect(req.appendCells.sheetId).toBe(11);
        expect(req.appendCells.rows[0].values[0]).toEqual({ userEnteredValue: { stringValue: 'new' } });
    });

    it('deletes rows bottom-up after all updates', () => {
        const reqs = buildChangeRequests(
            [
                { entity: 'assets', action: 'delete', key: 'a1' },
                { entity: 'assets', action: 'delete', key: 'a3' },
                { entity: 'assets', action: 'upsert', record: asset('a2', 'Kept') },
            ],
            { assets }
        );
        expect(reqs[0].updateCells).toBeDefined();
        expect(reqs.slice(-2).map((r) => r.deleteDimension.range.startIndex)).toEqual([3, 1]);
    });

    it('only writes the app’s columns, leaving user columns untouched', () => {
        const headers = ['ID', 'My notes', ...headersOf(ASSETS_TAB).slice(1)];
        const withUserColumn = state(ASSETS_TAB, 11, [['a1', 'my note']], headers);
        const reqs = buildChangeRequests([{ entity: 'assets', action: 'upsert', record: asset('a1', 'X') }], { assets: withUserColumn });
        const starts = reqs.map((r) => r.updateCells.start.columnIndex);
        expect(starts).toEqual([0, 2]); // skips column 1
    });

    it('updates the first settings row or appends one', () => {
        const settingsRecord = { madhab: 'Shafi', nisabStandard: 'Silver', calculationBasis: 'Hijri', baseCurrency: 'CAD' } as const;
        const existing = state(SETTINGS_TAB, 5, [['Hanafi']]);
        const [update] = buildChangeRequests([{ entity: 'settings', action: 'upsert', record: settingsRecord }], { settings: existing });
        expect(update.updateCells.start.rowIndex).toBe(1);

        const empty = state(SETTINGS_TAB, 5, []);
        const [append] = buildChangeRequests([{ entity: 'settings', action: 'upsert', record: settingsRecord }], { settings: empty });
        expect(append.appendCells).toBeDefined();
    });

    it('matches history rows by year', () => {
        const history = state(HISTORY_TAB, 7, [[2024, '2024-05-01'], [2025, '2025-05-01']]);
        const [req] = buildChangeRequests(
            [{ entity: 'history', action: 'upsert', record: { year: '2025', dateFinalized: '2025-06-01', totalAssets: 1, totalLiabilities: 0, netZakatable: 1, nisabThresholdUsed: 1, zakatPaid: 1, recipientsList: '' } }],
            { history }
        );
        expect(req.updateCells.start.rowIndex).toBe(2);
    });

    it('never turns text into a formula', () => {
        expect(toCellData('=IMPORTXML("http://evil")')).toEqual({ userEnteredValue: { stringValue: '=IMPORTXML("http://evil")' } });
    });
});

describe('formatting', () => {
    const meta = {
        sheetId: 3, title: 'Assets', columnCount: 26,
        protectedRangeIds: [{ id: 99, description: 'zakat-app:protected' }, { id: 100, description: 'user range' }],
        bandedRangeIds: [55],
    };
    const reqs = buildTabFormatRequests(ASSETS_TAB, meta, mapHeaders(ASSETS_TAB, headersOf(ASSETS_TAB)));

    it('replaces only its own protection and banding', () => {
        expect(reqs).toContainEqual({ deleteProtectedRange: { protectedRangeId: 99 } });
        expect(reqs).not.toContainEqual({ deleteProtectedRange: { protectedRangeId: 100 } });
        expect(reqs).toContainEqual({ deleteBanding: { bandedRangeId: 55 } });
    });

    it('adds dropdowns, checkboxes, hides the ID column and warns before edits', () => {
        const validations = reqs.filter((r) => r.setDataValidation).map((r) => r.setDataValidation.rule.condition.type);
        expect(validations).toContain('ONE_OF_LIST');
        expect(validations).toContain('BOOLEAN');
        expect(reqs).toContainEqual(expect.objectContaining({
            updateDimensionProperties: expect.objectContaining({ properties: { hiddenByUser: true } }),
        }));
        expect(reqs.at(-1)?.addProtectedRange.protectedRange.warningOnly).toBe(true);
    });
});

describe('buildSummaryRequest', () => {
    it('writes one row per year with live formulas for Zakat paid', () => {
        const donationsMap = mapHeaders(DONATIONS_TAB, DONATIONS_TAB.columns.map((c) => c.header));
        const req = buildSummaryRequest(
            1,
            {
                baseCurrency: 'USD',
                years: [
                    { year: '2025', totalAssets: 1, notZakatable: 0, debtsDeducted: 0, netZakatable: 1, nisab: 1, aboveNisab: true, zakatDue: 10 },
                    { year: '2026', totalAssets: 2, notZakatable: 0, debtsDeducted: 0, netZakatable: 2, nisab: 1, aboveNisab: true, zakatDue: 20 },
                ],
            },
            donationsMap,
            new Date('2026-11-18')
        );
        const rows = req.updateCells.rows;
        expect(rows[1].values[0].userEnteredValue.stringValue).toContain('2026-11-18');
        // Newest year first, directly under the header row.
        expect(rows[5].values[0].userEnteredValue.numberValue).toBe(2026);
        expect(rows[5].values[8].userEnteredValue.formulaValue).toBe(
            `=IFERROR(SUMIFS('Donations'!$E:$E,'Donations'!$B:$B,A6,'Donations'!$D:$D,"Zakat"),0)`
        );
        expect(rows[5].values[9].userEnteredValue.formulaValue).toBe('=MAX(0,H6-I6)');
    });
});
