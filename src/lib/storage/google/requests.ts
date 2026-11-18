/**
 * Pure builders for Google Sheets API requests. No network access here, so
 * everything in this file is unit-testable.
 */

import {
    type CellValue,
    type Column,
    type EntityName,
    type HeaderMap,
    type TabSchema,
    DATA_TABS,
    SETTINGS_TAB,
    DONATIONS_TAB,
    SUMMARY_TITLE,
    columnForHeader,
    isBlankRow,
    mapHeaders,
    parseCell,
    recordToRow,
    serializeCell,
    tabFor,
} from '../schema';
import { DEFAULT_SETTINGS } from '../../types';
import type { ChangeOp, SummaryPayload } from '../types';

// Loose shapes for the parts of the Sheets API we use.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type SheetsRequest = Record<string, any>;
export type CellData = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export const PROTECTION_TAG = 'zakat-app:protected';
export const META_SCHEMA_VERSION = 'zakat_app.schema_version';
export const META_LAST_BACKUP = 'zakat_app.last_backup_at';
export const META_BACKUP_FILE = 'zakat_app.backup_file_id';

const SUMMARY_MAX_ROWS = 120;
const SUMMARY_COLUMNS = 10;

const HEADER_BG = { red: 0.85, green: 0.93, blue: 0.88 };
const BAND_BG = { red: 0.97, green: 0.98, blue: 0.97 };
const WHITE = { red: 1, green: 1, blue: 1 };
const MUTED_TEXT = { red: 0.4, green: 0.4, blue: 0.4 };

// ─── State read from a spreadsheet ────────────────────────

export interface TabState {
    sheetId: number;
    map: HeaderMap;
    /** Data rows; rows[i] is sheet row i + 1 (0-based), i.e. the row under the header. */
    rows: CellValue[][];
}

export interface SheetMeta {
    sheetId: number;
    title: string;
    columnCount: number;
    protectedRangeIds: { id: number; description?: string }[];
    bandedRangeIds: number[];
}

export interface MetadataEntry {
    metadataId: number;
    metadataKey: string;
    metadataValue?: string;
}

// ─── Cells ────────────────────────────────────────────────

export function toCellData(value: CellValue): CellData {
    if (value === null || value === undefined || value === '') return {};
    if (typeof value === 'number') return { userEnteredValue: { numberValue: value } };
    if (typeof value === 'boolean') return { userEnteredValue: { boolValue: value } };
    // Always plain strings: values are never interpreted as formulas.
    return { userEnteredValue: { stringValue: value } };
}

/** Values API (RAW) form: '' clears a cell. */
export function toRawValue(value: CellValue): string | number | boolean {
    return value === null || value === undefined ? '' : value;
}

// ─── Layout planning / upgrades ───────────────────────────

export interface HeaderPlan {
    headers: string[];
    renamed: string[];
    added: string[];
    changed: boolean;
}

/**
 * Work out the header row for a tab: legacy headers are renamed in place,
 * missing columns are appended at the end, and user columns are untouched.
 */
export function planHeaders(tab: TabSchema, existing: CellValue[]): HeaderPlan {
    const headers = existing.map((h) => String(h ?? '').trim());
    // Drop trailing empty header cells.
    while (headers.length > 0 && headers[headers.length - 1] === '') headers.pop();

    const renamed: string[] = [];
    const seen = new Set<string>();
    headers.forEach((h, i) => {
        const column = columnForHeader(tab, h);
        if (!column || seen.has(column.key)) return;
        seen.add(column.key);
        if (h !== column.header) {
            renamed.push(`${tab.title}: ${h} → ${column.header}`);
            headers[i] = column.header;
        }
    });

    const added: string[] = [];
    for (const column of tab.columns) {
        if (!seen.has(column.key)) {
            headers.push(column.header);
            added.push(`${tab.title}: ${column.header}`);
        }
    }

    return { headers, renamed, added, changed: renamed.length > 0 || added.length > 0 };
}

export interface NormalizeResult {
    rows: CellValue[][];
    rowsFixed: number;
}

/**
 * Rewrite every known cell in its canonical form (labels for enums, real
 * booleans for checkboxes, numbers for years) and give keyed rows that have
 * no ID one. Unknown (user) columns are left as they are.
 */
export function normalizeRows(
    tab: TabSchema,
    map: HeaderMap,
    rows: CellValue[][],
    newId: () => string
): NormalizeResult {
    let rowsFixed = 0;
    const out = rows.map((row) => {
        if (isBlankRow(row)) return row;
        const normalized = [...row];
        let fixed = false;
        for (const column of tab.columns) {
            const index = map.indexByKey[column.key];
            if (index === undefined) continue;
            let value = parseCell(column, row[index] ?? null);
            if (column.key === 'id' && tab.keyField === 'id' && value === undefined) {
                value = newId();
                fixed = true;
            }
            if (column.key === 'zakatYear' && value === undefined) {
                value = new Date().getFullYear().toString();
                fixed = true;
            }
            normalized[index] = serializeCell(column, value);
        }
        if (fixed) rowsFixed++;
        return normalized;
    });
    return { rows: out, rowsFixed };
}

export function defaultSettingsRow(map: HeaderMap): CellValue[] {
    return recordToRow(SETTINGS_TAB, map, DEFAULT_SETTINGS as unknown as Record<string, unknown>);
}

// ─── Formatting ───────────────────────────────────────────

function numberFormatFor(column: Column): { type: string; pattern: string } | null {
    switch (column.type) {
        case 'money':
            return { type: 'NUMBER', pattern: '#,##0.00' };
        case 'percent':
            return { type: 'NUMBER', pattern: '0.##"%"' };
        case 'year':
            return { type: 'NUMBER', pattern: '0' };
        case 'number':
            return { type: 'NUMBER', pattern: '#,##0.####' };
        case 'string':
        case 'date':
            // Text, so entries like "9-1" aren't turned into dates by Sheets.
            return { type: 'TEXT', pattern: '@' };
        default:
            return null;
    }
}

/**
 * Formatting, dropdowns, checkboxes and edit warnings for one data tab.
 * Safe to apply repeatedly: old protection/banding is removed first.
 */
export function buildTabFormatRequests(tab: TabSchema, meta: SheetMeta, map: HeaderMap): SheetsRequest[] {
    const sheetId = meta.sheetId;
    const width = map.headers.length;
    const requests: SheetsRequest[] = [];

    for (const p of meta.protectedRangeIds) {
        if (p.description === PROTECTION_TAG) {
            requests.push({ deleteProtectedRange: { protectedRangeId: p.id } });
        }
    }
    for (const id of meta.bandedRangeIds) {
        requests.push({ deleteBanding: { bandedRangeId: id } });
    }

    requests.push({
        updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
        },
    });

    requests.push({
        addBanding: {
            bandedRange: {
                range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: width },
                rowProperties: { headerColor: HEADER_BG, firstBandColor: WHITE, secondBandColor: BAND_BG },
            },
        },
    });

    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: width },
            cell: { userEnteredFormat: { textFormat: { bold: true }, wrapStrategy: 'WRAP', verticalAlignment: 'MIDDLE' } },
            fields: 'userEnteredFormat(textFormat,wrapStrategy,verticalAlignment)',
        },
    });

    for (const column of tab.columns) {
        const index = map.indexByKey[column.key];
        if (index === undefined) continue;
        const range = { sheetId, startRowIndex: 1, startColumnIndex: index, endColumnIndex: index + 1 };

        const numberFormat = numberFormatFor(column);
        if (numberFormat) {
            requests.push({
                repeatCell: {
                    range,
                    cell: { userEnteredFormat: { numberFormat } },
                    fields: 'userEnteredFormat.numberFormat',
                },
            });
        }

        if (column.type === 'enum' && column.options) {
            requests.push({
                setDataValidation: {
                    range,
                    rule: {
                        condition: {
                            type: 'ONE_OF_LIST',
                            values: column.options.map((o) => ({ userEnteredValue: o.label })),
                        },
                        strict: true,
                        showCustomUi: true,
                    },
                },
            });
        } else if (column.type === 'boolean') {
            requests.push({
                setDataValidation: { range, rule: { condition: { type: 'BOOLEAN' }, strict: true } },
            });
        }
    }

    requests.push({
        autoResizeDimensions: {
            dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: width },
        },
    });

    for (const column of tab.columns) {
        const index = map.indexByKey[column.key];
        if (index === undefined) continue;
        requests.push({
            updateDimensionProperties: {
                range: { sheetId, dimension: 'COLUMNS', startIndex: index, endIndex: index + 1 },
                properties: { hiddenByUser: Boolean(column.hidden) },
                fields: 'hiddenByUser',
            },
        });
    }

    requests.push({
        addProtectedRange: {
            protectedRange: {
                range: { sheetId },
                description: PROTECTION_TAG,
                warningOnly: true,
            },
        },
    });

    return requests;
}

export function buildSummaryFormatRequests(meta: SheetMeta): SheetsRequest[] {
    const sheetId = meta.sheetId;
    const requests: SheetsRequest[] = [];
    for (const p of meta.protectedRangeIds) {
        if (p.description === PROTECTION_TAG) {
            requests.push({ deleteProtectedRange: { protectedRangeId: p.id } });
        }
    }
    requests.push({
        updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: SUMMARY_COLUMNS },
            properties: { pixelSize: 130 },
            fields: 'pixelSize',
        },
    });
    requests.push({
        updateSheetProperties: {
            properties: { sheetId, gridProperties: { hideGridlines: true } },
            fields: 'gridProperties.hideGridlines',
        },
    });
    requests.push({
        addProtectedRange: {
            protectedRange: { range: { sheetId }, description: PROTECTION_TAG, warningOnly: true },
        },
    });
    return requests;
}

// ─── Developer metadata (schema version, backups) ─────────

export function setMetadataRequest(existing: MetadataEntry[], key: string, value: string): SheetsRequest {
    const found = existing.find((m) => m.metadataKey === key);
    if (found) {
        return {
            updateDeveloperMetadata: {
                dataFilters: [{ developerMetadataLookup: { metadataId: found.metadataId } }],
                developerMetadata: { metadataValue: value },
                fields: 'metadataValue',
            },
        };
    }
    return {
        createDeveloperMetadata: {
            developerMetadata: {
                metadataKey: key,
                metadataValue: value,
                location: { spreadsheet: true },
                visibility: 'DOCUMENT',
            },
        },
    };
}

// ─── Summary tab ──────────────────────────────────────────

function columnLetter(index: number): string {
    let n = index + 1;
    let s = '';
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

const text = (value: string, format?: CellData): CellData => ({
    userEnteredValue: { stringValue: value },
    ...(format ? { userEnteredFormat: format } : {}),
});

const MONEY_FORMAT = { numberFormat: { type: 'NUMBER', pattern: '#,##0.00' } };

const money = (value: number): CellData => ({
    userEnteredValue: { numberValue: Math.round(value * 100) / 100 },
    userEnteredFormat: MONEY_FORMAT,
});

const formula = (value: string, format: CellData = MONEY_FORMAT): CellData => ({
    userEnteredValue: { formulaValue: value },
    userEnteredFormat: format,
});

/**
 * Rewrite the Summary tab. "Zakat Paid" and "Remaining" are live formulas
 * over the Donations tab so they stay correct even between app visits.
 */
export function buildSummaryRequest(
    summarySheetId: number,
    summary: SummaryPayload,
    donationsMap: HeaderMap | undefined,
    now: Date = new Date()
): SheetsRequest {
    const headerFormat = {
        textFormat: { bold: true },
        backgroundColor: HEADER_BG,
        wrapStrategy: 'WRAP',
        verticalAlignment: 'MIDDLE',
    };

    const rows: { values: CellData[] }[] = [
        { values: [text('Zakat Summary', { textFormat: { bold: true, fontSize: 16 } })] },
        {
            values: [
                text(`Amounts in ${summary.baseCurrency}. Updated by the app on ${now.toISOString().slice(0, 10)}.`, {
                    textFormat: { foregroundColor: MUTED_TEXT },
                }),
            ],
        },
        {
            values: [
                text(
                    'Make changes in the app. You can view, copy and print everything here, but editing the data tabs directly may cause mistakes.',
                    { textFormat: { foregroundColor: MUTED_TEXT, italic: true } }
                ),
            ],
        },
        { values: [] },
        {
            values: [
                'Zakat Year',
                'Total Assets',
                'Not Zakatable',
                'Debts Deducted',
                'Net Zakatable',
                'Nisab',
                'Above Nisab?',
                'Zakat Due',
                'Zakat Paid',
                'Remaining',
            ].map((h) => text(h, headerFormat)),
        },
    ];

    const yearCol = donationsMap?.indexByKey.zakatYear;
    const categoryCol = donationsMap?.indexByKey.category;
    const amountCol = donationsMap?.indexByKey.amount;
    const canSumDonations = yearCol !== undefined && categoryCol !== undefined && amountCol !== undefined;
    const ref = (i: number) => `'${DONATIONS_TAB.title}'!$${columnLetter(i)}:$${columnLetter(i)}`;
    const zakatLabel =
        DONATIONS_TAB.columns.find((c) => c.key === 'category')?.options?.find((o) => o.value === 'Zakat')?.label ??
        'Zakat';

    const years = [...summary.years].sort((a, b) => b.year.localeCompare(a.year));
    const firstDataRow = rows.length; // 0-based

    years.slice(0, SUMMARY_MAX_ROWS - firstDataRow).forEach((y, i) => {
        const sheetRow = firstDataRow + i + 1; // 1-based for A1 references
        const yearNumber = Number(y.year);
        rows.push({
            values: [
                Number.isFinite(yearNumber)
                    ? { userEnteredValue: { numberValue: yearNumber }, userEnteredFormat: { horizontalAlignment: 'LEFT' } }
                    : text(y.year),
                money(y.totalAssets),
                money(y.notZakatable),
                money(y.debtsDeducted),
                money(y.netZakatable),
                money(y.nisab),
                text(y.aboveNisab ? 'Yes' : 'No'),
                money(y.zakatDue),
                canSumDonations
                    ? formula(
                        `=IFERROR(SUMIFS(${ref(amountCol!)},${ref(yearCol!)},A${sheetRow},${ref(categoryCol!)},"${zakatLabel}"),0)`
                    )
                    : {},
                canSumDonations ? formula(`=MAX(0,H${sheetRow}-I${sheetRow})`) : {},
            ],
        });
    });

    if (years.length === 0) {
        rows.push({ values: [text('No data yet. Add your assets in the app to see your Zakat here.')] });
    }

    return {
        updateCells: {
            range: {
                sheetId: summarySheetId,
                startRowIndex: 0,
                endRowIndex: SUMMARY_MAX_ROWS,
                startColumnIndex: 0,
                endColumnIndex: SUMMARY_COLUMNS,
            },
            rows,
            fields: 'userEnteredValue,userEnteredFormat',
        },
    };
}

// ─── Changes ──────────────────────────────────────────────

/** Entities touched by a batch, plus Donations (needed for Summary formulas). */
export function entitiesToRead(ops: ChangeOp[], withSummary: boolean): EntityName[] {
    const set = new Set<EntityName>(ops.map((o) => o.entity));
    if (withSummary) set.add('donations');
    return DATA_TABS.map((t) => t.entity).filter((e) => set.has(e));
}

function opKey(op: ChangeOp): string {
    if (op.action === 'delete') return op.key;
    if (op.entity === 'settings') return 'settings';
    const tab = tabFor(op.entity);
    return String((op.record as unknown as Record<string, unknown>)[tab.keyField!] ?? '');
}

function findRows(tab: TabSchema, state: TabState, key: string): number[] {
    const keyColumn = tab.columns.find((c) => c.key === tab.keyField)!;
    const index = state.map.indexByKey[keyColumn.key];
    if (index === undefined) return [];
    const matches: number[] = [];
    state.rows.forEach((row, i) => {
        if (String(parseCell(keyColumn, row[index] ?? null) ?? '') === key) matches.push(i);
    });
    return matches;
}

/** Contiguous runs of column indexes, e.g. [0,1,2,5,6] → [[0,2],[5,6]]. */
function runs(indexes: number[]): [number, number][] {
    const sorted = [...indexes].sort((a, b) => a - b);
    const out: [number, number][] = [];
    for (const i of sorted) {
        const last = out[out.length - 1];
        if (last && i === last[1] + 1) last[1] = i;
        else out.push([i, i]);
    }
    return out;
}

/** Overwrite only the app's columns in an existing row, leaving user columns alone. */
function updateRowRequests(tab: TabSchema, state: TabState, rowIndex: number, record: Record<string, unknown>): SheetsRequest[] {
    const row = recordToRow(tab, state.map, record);
    const known = Object.values(state.map.indexByKey);
    return runs(known).map(([start, end]) => ({
        updateCells: {
            start: { sheetId: state.sheetId, rowIndex: rowIndex + 1, columnIndex: start },
            rows: [{ values: Array.from({ length: end - start + 1 }, (_, k) => toCellData(row[start + k] ?? null)) }],
            fields: 'userEnteredValue',
        },
    }));
}

/**
 * Turn a batch of changes into one spreadsheets.batchUpdate request list.
 * Updates and appends come first; row deletions come last, bottom-up, so
 * earlier row numbers stay valid.
 */
export function buildChangeRequests(
    ops: ChangeOp[],
    tabs: Partial<Record<EntityName, TabState>>
): SheetsRequest[] {
    const requests: SheetsRequest[] = [];
    const deletions: { sheetId: number; rowIndex: number }[] = [];

    for (const op of ops) {
        const tab = tabFor(op.entity);
        const state = tabs[op.entity];
        if (!state) throw new Error(`Tab not loaded: ${tab.title}`);

        if (op.action === 'delete') {
            for (const i of findRows(tab, state, op.key)) {
                deletions.push({ sheetId: state.sheetId, rowIndex: i + 1 });
            }
            continue;
        }

        const record = op.record as unknown as Record<string, unknown>;
        const matches =
            op.entity === 'settings'
                ? state.rows.findIndex((r) => !isBlankRow(r)) >= 0
                    ? [state.rows.findIndex((r) => !isBlankRow(r))]
                    : []
                : findRows(tab, state, opKey(op));

        if (matches.length > 0) {
            requests.push(...updateRowRequests(tab, state, matches[0], record));
        } else {
            const row = recordToRow(tab, state.map, record);
            requests.push({
                appendCells: {
                    sheetId: state.sheetId,
                    rows: [{ values: row.map(toCellData) }],
                    fields: 'userEnteredValue',
                },
            });
        }
    }

    const seen = new Set<string>();
    deletions
        .filter((d) => {
            const k = `${d.sheetId}:${d.rowIndex}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        })
        .sort((a, b) => b.rowIndex - a.rowIndex)
        .forEach((d) =>
            requests.push({
                deleteDimension: {
                    range: { sheetId: d.sheetId, dimension: 'ROWS', startIndex: d.rowIndex, endIndex: d.rowIndex + 1 },
                },
            })
        );

    return requests;
}

/** Does the tab have every column the app needs? */
export function hasAllColumns(tab: TabSchema, headerRow: CellValue[]): boolean {
    const map = mapHeaders(tab, headerRow);
    return tab.columns.every((c) => map.indexByKey[c.key] !== undefined);
}

/** Headers that are still in an older naming scheme. */
export function hasLegacyHeaders(tab: TabSchema, headerRow: CellValue[]): boolean {
    return headerRow.some((h) => {
        const column = columnForHeader(tab, h);
        return column !== undefined && String(h).trim() !== column.header;
    });
}

export { SUMMARY_TITLE };
