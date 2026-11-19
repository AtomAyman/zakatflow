/**
 * A small in-memory stand-in for the parts of the Google Drive and Sheets
 * APIs the provider uses, so its network logic can be tested end-to-end.
 * Test-only; not imported by the app.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Cell = string | number | boolean | null;

interface FakeSheet {
    sheetId: number;
    title: string;
    index: number;
    columnCount: number;
    values: Cell[][];
    protectedRanges: { protectedRangeId: number; description?: string }[];
    bandedRanges: { bandedRangeId: number }[];
    hiddenColumns: Set<number>;
}

interface FakeFile {
    id: string;
    name: string;
    appProperties: Record<string, string>;
    trashed: boolean;
    sheets: FakeSheet[];
    metadata: { metadataId: number; metadataKey: string; metadataValue: string }[];
}

let counter = 1000;
const nextId = () => ++counter;

export class FakeGoogle {
    files = new Map<string, FakeFile>();
    calls: string[] = [];

    /** Add a spreadsheet the way the old version of the app created them. */
    addLegacySpreadsheet(name: string, tabs: Record<string, Cell[][]>): string {
        const id = `file_${nextId()}`;
        this.files.set(id, {
            id,
            name,
            appProperties: {},
            trashed: false,
            metadata: [],
            sheets: Object.entries(tabs).map(([title, values], index) => this.newSheet(title, index, values)),
        });
        return id;
    }

    sheet(fileId: string, title: string): FakeSheet | undefined {
        return this.files.get(fileId)?.sheets.find((s) => s.title === title);
    }

    private newSheet(title: string, index: number, values: Cell[][] = [], columnCount = 26): FakeSheet {
        return {
            sheetId: nextId(),
            title,
            index,
            columnCount,
            values: values.map((r) => [...r]),
            protectedRanges: [],
            bandedRanges: [],
            hiddenColumns: new Set(),
        };
    }

    fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
        const url = new URL(typeof input === 'string' ? input : input.toString());
        const method = (init.method || 'GET').toUpperCase();
        const body = init.body ? JSON.parse(String(init.body)) : undefined;
        this.calls.push(`${method} ${url.hostname}${url.pathname}`);

        try {
            const result = this.route(method, url, body);
            return new Response(JSON.stringify(result ?? {}), { status: 200 });
        } catch (e: any) {
            const status = e?.status ?? 500;
            return new Response(JSON.stringify({ error: { message: e?.message ?? 'error' } }), { status });
        }
    };

    private file(id: string): FakeFile {
        const f = this.files.get(id);
        if (!f || f.trashed) throw Object.assign(new Error('File not found'), { status: 404 });
        return f;
    }

    private route(method: string, url: URL, body: any): any {
        const path = url.pathname;

        // ── Drive ──
        if (url.hostname === 'www.googleapis.com') {
            const m = path.match(/^\/drive\/v3\/files(?:\/([^/]+))?(\/copy)?$/);
            if (!m) throw Object.assign(new Error('bad drive path'), { status: 400 });
            const [, id, copy] = m;

            if (!id && method === 'GET') {
                const q = url.searchParams.get('q') ?? '';
                const tag = q.match(/key='(\w+)' and value='(\w+)'/);
                const name = q.match(/name='([^']+)'/);
                const files = [...this.files.values()].filter(
                    (f) =>
                        !f.trashed &&
                        (!tag || f.appProperties[tag[1]] === tag[2]) &&
                        (!name || f.name === name[1])
                );
                return { files: files.map((f) => ({ id: f.id })) };
            }
            if (!id && method === 'POST') {
                const newId = `file_${nextId()}`;
                this.files.set(newId, {
                    id: newId,
                    name: body.name,
                    appProperties: body.appProperties ?? {},
                    trashed: false,
                    metadata: [],
                    sheets: [this.newSheet('Sheet1', 0)],
                });
                return { id: newId };
            }
            if (id && copy) {
                const source = this.file(id);
                const newId = `file_${nextId()}`;
                this.files.set(newId, {
                    ...structuredClone({ ...source, sheets: [] }),
                    sheets: source.sheets.map((s) => ({ ...s, values: s.values.map((r) => [...r]), hiddenColumns: new Set(s.hiddenColumns) })),
                    id: newId,
                    name: body.name,
                    appProperties: { ...source.appProperties, ...(body.appProperties ?? {}) },
                });
                return { id: newId };
            }
            if (id && method === 'PATCH') {
                const f = this.files.get(id);
                if (!f) throw Object.assign(new Error('File not found'), { status: 404 });
                if (body.appProperties) Object.assign(f.appProperties, body.appProperties);
                if (body.trashed !== undefined) f.trashed = body.trashed;
                return {};
            }
        }

        // ── Sheets ──
        const m = path.match(/^\/v4\/spreadsheets\/([^/:]+)(?:\/values)?(:\w+)?$/);
        if (!m) throw Object.assign(new Error('bad sheets path'), { status: 400 });
        const file = this.file(m[1]);
        const action = m[2];
        const isValues = path.includes('/values');

        if (!action && method === 'GET') {
            return {
                spreadsheetId: file.id,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
                properties: { title: file.name },
                developerMetadata: file.metadata,
                sheets: [...file.sheets]
                    .sort((a, b) => a.index - b.index)
                    .map((s) => ({
                        properties: { sheetId: s.sheetId, title: s.title, gridProperties: { columnCount: s.columnCount } },
                        protectedRanges: s.protectedRanges,
                        bandedRanges: s.bandedRanges,
                    })),
            };
        }

        if (isValues && action === ':batchGet') {
            const ranges = url.searchParams.getAll('ranges');
            return {
                valueRanges: ranges.map((r) => {
                    const title = r.replace(/^'|'$/g, '').replace(/''/g, "'");
                    const sheet = file.sheets.find((s) => s.title === title);
                    if (!sheet) throw Object.assign(new Error(`Unable to parse range: ${r}`), { status: 400 });
                    return { range: r, values: trimValues(sheet.values) };
                }),
            };
        }

        if (isValues && action === ':batchUpdate') {
            for (const d of body.data) {
                const title = d.range.split('!')[0].replace(/^'|'$/g, '');
                const sheet = file.sheets.find((s) => s.title === title)!;
                d.values.forEach((row: Cell[], r: number) => {
                    row.forEach((v, c) => setCell(sheet, r, c, v === '' ? null : v));
                });
            }
            return {};
        }

        if (!isValues && action === ':batchUpdate') {
            const replies = body.requests.map((req: any) => this.apply(file, req));
            return { replies };
        }

        throw Object.assign(new Error(`unhandled ${method} ${path}`), { status: 400 });
    }

    private apply(file: FakeFile, req: any): any {
        const sheetById = (id: number) => {
            const s = file.sheets.find((x) => x.sheetId === id);
            if (!s) throw Object.assign(new Error(`No sheet ${id}`), { status: 400 });
            return s;
        };
        const [type] = Object.keys(req);
        const r = req[type];

        switch (type) {
            case 'addSheet': {
                if (file.sheets.some((s) => s.title === r.properties.title)) {
                    throw Object.assign(new Error('A sheet with that name already exists'), { status: 400 });
                }
                const sheet = this.newSheet(r.properties.title, r.properties.index ?? file.sheets.length, [], r.properties.gridProperties?.columnCount ?? 26);
                file.sheets.push(sheet);
                return { addSheet: { properties: { sheetId: sheet.sheetId, title: sheet.title, gridProperties: { columnCount: sheet.columnCount } } } };
            }
            case 'deleteSheet':
                file.sheets = file.sheets.filter((s) => s.sheetId !== r.sheetId);
                if (file.sheets.length === 0) throw Object.assign(new Error('Cannot delete last sheet'), { status: 400 });
                return {};
            case 'updateSheetProperties': {
                const s = sheetById(r.properties.sheetId);
                if (r.properties.gridProperties?.columnCount) s.columnCount = r.properties.gridProperties.columnCount;
                return {};
            }
            case 'updateCells': {
                const s = sheetById(r.start?.sheetId ?? r.range.sheetId);
                const startRow = r.start?.rowIndex ?? r.range.startRowIndex ?? 0;
                const startCol = r.start?.columnIndex ?? r.range.startColumnIndex ?? 0;
                if (r.range) {
                    for (let row = r.range.startRowIndex; row < r.range.endRowIndex; row++) {
                        for (let col = r.range.startColumnIndex; col < r.range.endColumnIndex; col++) setCell(s, row, col, null);
                    }
                }
                r.rows.forEach((row: any, i: number) =>
                    (row.values ?? []).forEach((cell: any, j: number) => setCell(s, startRow + i, startCol + j, fromCellData(cell)))
                );
                return {};
            }
            case 'appendCells': {
                const s = sheetById(r.sheetId);
                const trimmed = trimValues(s.values);
                const at = trimmed.length;
                r.rows.forEach((row: any, i: number) =>
                    row.values.forEach((cell: any, j: number) => setCell(s, at + i, j, fromCellData(cell)))
                );
                return {};
            }
            case 'deleteDimension': {
                const s = sheetById(r.range.sheetId);
                if (r.range.dimension === 'ROWS') s.values.splice(r.range.startIndex, r.range.endIndex - r.range.startIndex);
                return {};
            }
            case 'createDeveloperMetadata':
                file.metadata.push({
                    metadataId: nextId(),
                    metadataKey: r.developerMetadata.metadataKey,
                    metadataValue: r.developerMetadata.metadataValue,
                });
                return {};
            case 'updateDeveloperMetadata': {
                const id = r.dataFilters[0].developerMetadataLookup.metadataId;
                const m = file.metadata.find((x) => x.metadataId === id);
                if (m) m.metadataValue = r.developerMetadata.metadataValue;
                return {};
            }
            case 'addProtectedRange': {
                const s = sheetById(r.protectedRange.range.sheetId);
                s.protectedRanges.push({ protectedRangeId: nextId(), description: r.protectedRange.description });
                return {};
            }
            case 'deleteProtectedRange':
                for (const s of file.sheets) s.protectedRanges = s.protectedRanges.filter((p) => p.protectedRangeId !== r.protectedRangeId);
                return {};
            case 'addBanding': {
                const s = sheetById(r.bandedRange.range.sheetId);
                if (s.bandedRanges.length > 0) throw Object.assign(new Error('Banding already exists'), { status: 400 });
                s.bandedRanges.push({ bandedRangeId: nextId() });
                return {};
            }
            case 'deleteBanding':
                for (const s of file.sheets) s.bandedRanges = s.bandedRanges.filter((b) => b.bandedRangeId !== r.bandedRangeId);
                return {};
            case 'updateDimensionProperties': {
                const s = sheetById(r.range.sheetId);
                if (r.range.dimension === 'COLUMNS' && 'hiddenByUser' in r.properties) {
                    for (let i = r.range.startIndex; i < r.range.endIndex; i++) {
                        if (r.properties.hiddenByUser) s.hiddenColumns.add(i);
                        else s.hiddenColumns.delete(i);
                    }
                }
                return {};
            }
            default:
                // Formatting-only requests (repeatCell, setDataValidation, autoResize…).
                return {};
        }
    }
}

function fromCellData(cell: any): Cell {
    const v = cell?.userEnteredValue;
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('numberValue' in v) return v.numberValue;
    if ('boolValue' in v) return v.boolValue;
    if ('formulaValue' in v) return v.formulaValue;
    return null;
}

function setCell(sheet: FakeSheet, row: number, col: number, value: Cell) {
    if (col >= sheet.columnCount) {
        throw Object.assign(new Error(`Column ${col} exceeds grid width ${sheet.columnCount}`), { status: 400 });
    }
    while (sheet.values.length <= row) sheet.values.push([]);
    const r = sheet.values[row];
    while (r.length <= col) r.push(null);
    r[col] = value;
}

/** Like the real API: drop trailing empty cells and rows. */
function trimValues(values: Cell[][]): Cell[][] {
    const rows = values.map((r) => {
        const copy = [...r];
        while (copy.length && (copy[copy.length - 1] === null || copy[copy.length - 1] === '')) copy.pop();
        return copy.map((c) => (c === null ? '' : c));
    });
    while (rows.length && rows[rows.length - 1].length === 0) rows.pop();
    return rows;
}
