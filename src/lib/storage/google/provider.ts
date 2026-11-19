import { v4 as uuid } from 'uuid';
import {
    type CellValue,
    type EntityName,
    type TabSchema,
    DATA_TABS,
    SCHEMA_VERSION,
    SETTINGS_TAB,
    SUMMARY_TITLE,
    isBlankRow,
    mapHeaders,
    rowToRecord,
    toAsset,
    toDonation,
    toHistoryEntry,
    toLiability,
    toSettings,
} from '../schema';
import {
    type ChangeOp,
    type LoadResult,
    type RepairReport,
    type StorageProvider,
    type SummaryPayload,
    type UserData,
    StorageError,
} from '../types';
import {
    type MetadataEntry,
    type SheetMeta,
    type SheetsRequest,
    type TabState,
    META_BACKUP_FILE,
    META_LAST_BACKUP,
    META_SCHEMA_VERSION,
    buildChangeRequests,
    buildSummaryFormatRequests,
    buildSummaryRequest,
    buildTabFormatRequests,
    defaultSettingsRow,
    entitiesToRead,
    hasAllColumns,
    hasLegacyHeaders,
    normalizeRows,
    planHeaders,
    setMetadataRequest,
    toRawValue,
} from './requests';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const SPREADSHEET_MIME = 'application/vnd.google-apps.spreadsheet';

const FILE_TITLE = 'Zakat Dashboard';
/** Names used by earlier versions, so existing users' sheets are found. */
const LEGACY_TITLES = ['My_Zakat_Dashboard'];
/** Drive appProperties tag, so the sheet is found even if the user renames it. */
const APP_TAG_KEY = 'zakatApp';

const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const META_FIELDS =
    'spreadsheetId,spreadsheetUrl,properties.title,developerMetadata(metadataId,metadataKey,metadataValue),' +
    'sheets(properties(sheetId,title,gridProperties.columnCount),protectedRanges(protectedRangeId,description),bandedRanges(bandedRangeId))';

// ─── HTTP ─────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* eslint-disable @typescript-eslint/no-explicit-any */
async function request(token: string, url: string, init: RequestInit = {}, attempt = 0): Promise<any> {
    const res = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });

    if (res.ok) {
        return res.status === 204 ? null : res.json();
    }

    const body = await res.json().catch(() => ({}));
    const message: string = body?.error?.message || `Google API error ${res.status}`;

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 3) {
        await sleep(500 * 2 ** attempt);
        return request(token, url, init, attempt + 1);
    }

    if (res.status === 401) throw new StorageError('REAUTH', message);
    if (res.status === 403 && /scope|insufficient|unauthenticated/i.test(message)) {
        throw new StorageError('REAUTH', message);
    }
    if (res.status === 403 || res.status === 404) throw new StorageError('NOT_FOUND', message);
    if (res.status === 429) throw new StorageError('RATE_LIMITED', message);
    if (res.status === 400) throw new StorageError('INVALID', message);
    throw new StorageError('UNKNOWN', message);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const quoteTitle = (title: string) => `'${title.replace(/'/g, "''")}'`;

// ─── Spreadsheet state ────────────────────────────────────

interface SpreadsheetState {
    id: string;
    url: string;
    title: string;
    sheets: Record<string, SheetMeta>;
    metadata: MetadataEntry[];
}

interface LayoutResult extends SpreadsheetState {
    tabs: Partial<Record<EntityName, TabState>>;
    upgraded: boolean;
    report: RepairReport;
}

export class GoogleSheetsProvider implements StorageProvider {
    constructor(private readonly token: string) {}

    private call(url: string, init?: RequestInit) {
        return request(this.token, url, init);
    }

    // ── Finding / creating the user's file ──

    private async listFiles(q: string): Promise<string[]> {
        const params = new URLSearchParams({ q, orderBy: 'modifiedTime desc', fields: 'files(id)', pageSize: '5' });
        const data = await this.call(`${DRIVE_API}?${params}`);
        return (data?.files ?? []).map((f: { id: string }) => f.id);
    }

    private async findPrimary(): Promise<string | null> {
        const base = `mimeType='${SPREADSHEET_MIME}' and trashed=false`;
        const tagged = await this.listFiles(
            `${base} and appProperties has { key='${APP_TAG_KEY}' and value='primary' }`
        );
        if (tagged.length > 0) return tagged[0];

        for (const title of [FILE_TITLE, ...LEGACY_TITLES]) {
            const found = await this.listFiles(`${base} and name='${title}'`);
            if (found.length > 0) {
                // Tag it so it is still found if the user renames it.
                await this.call(`${DRIVE_API}/${found[0]}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ appProperties: { [APP_TAG_KEY]: 'primary' } }),
                }).catch((e) => console.error('Tagging sheet failed:', e));
                return found[0];
            }
        }
        return null;
    }

    private async createFile(): Promise<string> {
        const created = await this.call(`${DRIVE_API}?fields=id`, {
            method: 'POST',
            body: JSON.stringify({
                name: FILE_TITLE,
                mimeType: SPREADSHEET_MIME,
                appProperties: { [APP_TAG_KEY]: 'primary' },
            }),
        });
        return created.id;
    }

    private async getState(id: string): Promise<SpreadsheetState> {
        const data = await this.call(`${SHEETS_API}/${id}?fields=${encodeURIComponent(META_FIELDS)}`);
        const sheets: Record<string, SheetMeta> = {};
        for (const s of data.sheets ?? []) {
            sheets[s.properties.title] = {
                sheetId: s.properties.sheetId,
                title: s.properties.title,
                columnCount: s.properties.gridProperties?.columnCount ?? 26,
                protectedRangeIds: (s.protectedRanges ?? []).map((p: { protectedRangeId: number; description?: string }) => ({
                    id: p.protectedRangeId,
                    description: p.description,
                })),
                bandedRangeIds: (s.bandedRanges ?? []).map((b: { bandedRangeId: number }) => b.bandedRangeId),
            };
        }
        return {
            id,
            url: data.spreadsheetUrl,
            title: data.properties?.title ?? FILE_TITLE,
            sheets,
            metadata: data.developerMetadata ?? [],
        };
    }

    private async readTabs(id: string, tabs: TabSchema[], sheets: Record<string, SheetMeta>): Promise<Map<string, CellValue[][]>> {
        const present = tabs.filter((t) => sheets[t.title]);
        const result = new Map<string, CellValue[][]>();
        if (present.length === 0) return result;

        const params = new URLSearchParams({
            valueRenderOption: 'UNFORMATTED_VALUE',
            dateTimeRenderOption: 'SERIAL_NUMBER',
            majorDimension: 'ROWS',
        });
        for (const t of present) params.append('ranges', quoteTitle(t.title));

        const data = await this.call(`${SHEETS_API}/${id}/values:batchGet?${params}`);
        present.forEach((t, i) => result.set(t.title, data.valueRanges?.[i]?.values ?? []));
        return result;
    }

    private async batchUpdate(id: string, requests: SheetsRequest[]) {
        if (requests.length === 0) return null;
        return this.call(`${SHEETS_API}/${id}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({ requests }),
        });
    }

    // ── Layout: upgrade, repair, format ──

    /**
     * Read the whole file and bring it up to the current layout if needed.
     * When nothing needs fixing this costs two API calls (metadata + values).
     */
    private async ensureLayout(id: string, opts: { force?: boolean; created?: boolean } = {}): Promise<LayoutResult> {
        const state = await this.getState(id);
        const values = await this.readTabs(id, DATA_TABS, state.sheets);

        const version = Number(state.metadata.find((m) => m.metadataKey === META_SCHEMA_VERSION)?.metadataValue ?? 1);
        const missingTabs = DATA_TABS.filter((t) => !state.sheets[t.title]);
        const summaryMissing = !state.sheets[SUMMARY_TITLE];

        let rowsFixed = 0;
        const plans = DATA_TABS.map((tab) => {
            const raw = values.get(tab.title) ?? [];
            const headerRow = raw[0] ?? [];
            const headerPlan = planHeaders(tab, headerRow);
            const map = mapHeaders(tab, headerPlan.headers);
            const normalized = normalizeRows(tab, map, raw.slice(1), uuid);
            rowsFixed += normalized.rowsFixed;
            return { tab, headerRow, headerPlan, map, rawRows: raw.slice(1), rows: normalized.rows };
        });

        const needsUpgrade =
            opts.force ||
            version < SCHEMA_VERSION ||
            missingTabs.length > 0 ||
            summaryMissing ||
            rowsFixed > 0 ||
            plans.some((p) => !hasAllColumns(p.tab, p.headerRow) || hasLegacyHeaders(p.tab, p.headerRow));

        if (!needsUpgrade) {
            const tabs: Partial<Record<EntityName, TabState>> = {};
            for (const p of plans) {
                tabs[p.tab.entity] = { sheetId: state.sheets[p.tab.title].sheetId, map: p.map, rows: p.rawRows };
            }
            return { ...state, tabs, upgraded: false, report: { tabsCreated: [], columnsAdded: [], rowsFixed: 0 } };
        }

        // 1. Structure: add missing tabs, widen narrow ones, drop the default
        //    empty tab of a brand-new file.
        const structure: SheetsRequest[] = [];
        const tabsToAdd = [
            ...(summaryMissing ? [{ title: SUMMARY_TITLE, index: 0 }] : []),
            ...missingTabs.map((t) => ({ title: t.title, index: DATA_TABS.indexOf(t) + 1 })),
        ];
        for (const t of tabsToAdd) {
            const width = Math.max(26, DATA_TABS.find((d) => d.title === t.title)?.columns.length ?? 0);
            structure.push({
                addSheet: { properties: { title: t.title, index: t.index, gridProperties: { rowCount: 1000, columnCount: width } } },
            });
        }
        for (const p of plans) {
            const meta = state.sheets[p.tab.title];
            if (meta && p.headerPlan.headers.length > meta.columnCount) {
                structure.push({
                    updateSheetProperties: {
                        properties: { sheetId: meta.sheetId, gridProperties: { columnCount: p.headerPlan.headers.length } },
                        fields: 'gridProperties.columnCount',
                    },
                });
            }
        }
        if (opts.created) {
            const ours = new Set([SUMMARY_TITLE, ...DATA_TABS.map((t) => t.title)]);
            for (const meta of Object.values(state.sheets)) {
                if (!ours.has(meta.title)) structure.push({ deleteSheet: { sheetId: meta.sheetId } });
            }
        }

        const structureResult = await this.batchUpdate(id, structure);
        for (const reply of structureResult?.replies ?? []) {
            const props = reply?.addSheet?.properties;
            if (props) {
                state.sheets[props.title] = {
                    sheetId: props.sheetId,
                    title: props.title,
                    columnCount: props.gridProperties?.columnCount ?? 26,
                    protectedRangeIds: [],
                    bandedRangeIds: [],
                };
            }
        }

        // 2. Values: headers and normalized rows.
        const data = plans.map((p) => {
            let rows = p.rows;
            if (p.tab === SETTINGS_TAB && !rows.some((r) => !isBlankRow(r))) {
                rows = [defaultSettingsRow(p.map)];
            }
            p.rows = rows;
            return {
                range: `${quoteTitle(p.tab.title)}!A1`,
                values: [p.headerPlan.headers, ...rows].map((r) => r.map(toRawValue)),
            };
        });
        await this.call(`${SHEETS_API}/${id}/values:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({ valueInputOption: 'RAW', data }),
        });

        // 3. Formatting, protection and version stamp.
        const formatting: SheetsRequest[] = [];
        for (const p of plans) {
            formatting.push(...buildTabFormatRequests(p.tab, state.sheets[p.tab.title], p.map));
        }
        const summaryMeta = state.sheets[SUMMARY_TITLE];
        formatting.push(...buildSummaryFormatRequests(summaryMeta));
        if (summaryMissing) {
            formatting.push(buildSummaryRequest(summaryMeta.sheetId, { baseCurrency: 'USD', years: [] }, undefined));
        }
        formatting.push(setMetadataRequest(state.metadata, META_SCHEMA_VERSION, String(SCHEMA_VERSION)));
        if (opts.created) {
            // Start the weekly backup clock now; an empty sheet needs no backup.
            formatting.push(setMetadataRequest(state.metadata, META_LAST_BACKUP, new Date().toISOString()));
        }
        await this.batchUpdate(id, formatting);

        const tabs: Partial<Record<EntityName, TabState>> = {};
        for (const p of plans) {
            tabs[p.tab.entity] = { sheetId: state.sheets[p.tab.title].sheetId, map: p.map, rows: p.rows };
        }

        return {
            ...state,
            tabs,
            upgraded: true,
            report: {
                tabsCreated: tabsToAdd.map((t) => t.title),
                columnsAdded: plans.flatMap((p) => (hasAllColumns(p.tab, p.headerRow) ? [] : p.headerPlan.added)),
                rowsFixed,
            },
        };
    }

    // ── Backups ──

    private async maybeBackup(layout: LayoutResult): Promise<void> {
        const last = layout.metadata.find((m) => m.metadataKey === META_LAST_BACKUP)?.metadataValue;
        if (last && Date.now() - new Date(last).getTime() < BACKUP_INTERVAL_MS) return;

        const date = new Date().toISOString().slice(0, 10);
        const copy = await this.call(`${DRIVE_API}/${layout.id}/copy?fields=id`, {
            method: 'POST',
            body: JSON.stringify({
                name: `${layout.title} (automatic backup ${date})`,
                appProperties: { [APP_TAG_KEY]: 'backup' },
            }),
        });

        // Keep one rolling backup: move the previous one to the trash
        // (recoverable for 30 days) rather than deleting it.
        const previous = layout.metadata.find((m) => m.metadataKey === META_BACKUP_FILE)?.metadataValue;
        if (previous && previous !== copy.id) {
            await this.call(`${DRIVE_API}/${previous}`, {
                method: 'PATCH',
                body: JSON.stringify({ trashed: true }),
            }).catch((e) => console.error('Trashing old backup failed:', e));
        }

        await this.batchUpdate(layout.id, [
            setMetadataRequest(layout.metadata, META_LAST_BACKUP, new Date().toISOString()),
            setMetadataRequest(layout.metadata, META_BACKUP_FILE, copy.id),
        ]);
    }

    // ── StorageProvider ──

    async load(): Promise<LoadResult> {
        let id = await this.findPrimary();
        let created = false;
        if (!id) {
            id = await this.createFile();
            created = true;
        }

        const layout = await this.ensureLayout(id, { force: created, created });

        if (!created) {
            await this.maybeBackup(layout).catch((e) => console.error('Backup failed:', e));
        }

        return {
            file: {
                id,
                url: layout.url || `https://docs.google.com/spreadsheets/d/${id}`,
                providerName: 'Google Sheets',
            },
            data: toUserData(layout.tabs),
            summaryStale: layout.upgraded,
        };
    }

    async applyChanges(fileId: string, ops: ChangeOp[], summary?: SummaryPayload): Promise<void> {
        if (ops.length === 0 && !summary) return;

        const state = await this.getState(fileId);
        const entities = entitiesToRead(ops, Boolean(summary));
        const tabsNeeded = DATA_TABS.filter((t) => entities.includes(t.entity));
        const values = await this.readTabs(fileId, tabsNeeded, state.sheets);

        const broken =
            (summary && !state.sheets[SUMMARY_TITLE]) ||
            tabsNeeded.some((t) => !state.sheets[t.title] || !hasAllColumns(t, values.get(t.title)?.[0] ?? []));

        let sheets = state.sheets;
        let tabs: Partial<Record<EntityName, TabState>> = {};

        if (broken) {
            // Someone deleted a tab or column: repair first, then apply.
            const layout = await this.ensureLayout(fileId);
            sheets = layout.sheets;
            tabs = layout.tabs;
        } else {
            for (const t of tabsNeeded) {
                const raw = values.get(t.title) ?? [];
                tabs[t.entity] = {
                    sheetId: state.sheets[t.title].sheetId,
                    map: mapHeaders(t, raw[0] ?? []),
                    rows: raw.slice(1),
                };
            }
        }

        const requests = buildChangeRequests(ops, tabs);
        if (summary && sheets[SUMMARY_TITLE]) {
            requests.push(buildSummaryRequest(sheets[SUMMARY_TITLE].sheetId, summary, tabs.donations?.map));
        }
        await this.batchUpdate(fileId, requests);
    }

    async repair(fileId: string): Promise<RepairReport> {
        const layout = await this.ensureLayout(fileId, { force: true });
        return layout.report;
    }
}

function toUserData(tabs: Partial<Record<EntityName, TabState>>): UserData {
    const records = (entity: EntityName) => {
        const state = tabs[entity];
        if (!state) return [];
        const tab = DATA_TABS.find((t) => t.entity === entity)!;
        return state.rows.filter((r) => !isBlankRow(r)).map((r) => rowToRecord(tab, state.map, r));
    };

    return {
        settings: toSettings(records('settings')[0]),
        assets: records('assets').filter((r) => r.id).map(toAsset),
        liabilities: records('liabilities').filter((r) => r.id).map(toLiability),
        history: records('history').filter((r) => r.year).map(toHistoryEntry),
        donations: records('donations').filter((r) => r.id).map(toDonation),
    };
}
