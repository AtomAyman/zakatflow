import type { Asset, DonationEntry, HistoryEntry, Liability, Settings } from '../types';

/**
 * Everything the app keeps for a user. Loaded once per session and held in
 * memory in the browser; never written to browser storage.
 */
export interface UserData {
    settings: Settings;
    assets: Asset[];
    liabilities: Liability[];
    history: HistoryEntry[];
    donations: DonationEntry[];
}

/** A single change to save. Ops on the same record are coalesced client-side. */
export type ChangeOp =
    | { entity: 'settings'; action: 'upsert'; record: Settings }
    | { entity: 'assets'; action: 'upsert'; record: Asset }
    | { entity: 'liabilities'; action: 'upsert'; record: Liability }
    | { entity: 'history'; action: 'upsert'; record: HistoryEntry }
    | { entity: 'donations'; action: 'upsert'; record: DonationEntry }
    | { entity: 'assets' | 'liabilities' | 'donations'; action: 'delete'; key: string }
    | { entity: 'history'; action: 'delete'; key: string };

/** One row of the human-readable Summary tab, calculated by the app. */
export interface YearSummary {
    year: string;
    totalAssets: number;
    notZakatable: number;
    debtsDeducted: number;
    netZakatable: number;
    nisab: number;
    aboveNisab: boolean;
    zakatDue: number;
}

export interface SummaryPayload {
    baseCurrency: string;
    years: YearSummary[];
}

export interface StorageFile {
    /** Backend-specific file identifier. */
    id: string;
    /** Link the user can open to see their data. */
    url: string;
    /** Display name of the backend, e.g. "Google Sheets". */
    providerName: string;
}

export interface LoadResult {
    file: StorageFile;
    data: UserData;
    /** True when the file was just created or upgraded, so the Summary tab needs filling. */
    summaryStale: boolean;
}

export interface RepairReport {
    tabsCreated: string[];
    columnsAdded: string[];
    rowsFixed: number;
}

/**
 * A place user data lives (Google Sheets today; Excel on OneDrive later).
 * Implementations run on the server with the signed-in user's credentials.
 */
export interface StorageProvider {
    /** Find (or create) the user's file, upgrade it if needed, and read everything. */
    load(): Promise<LoadResult>;
    /** Apply a batch of changes and refresh the Summary in as few API calls as possible. */
    applyChanges(fileId: string, ops: ChangeOp[], summary?: SummaryPayload): Promise<void>;
    /** Restore missing tabs/columns, formatting and protection without touching data. */
    repair(fileId: string): Promise<RepairReport>;
}

export type StorageErrorCode = 'REAUTH' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INVALID' | 'UNKNOWN';

export class StorageError extends Error {
    constructor(public code: StorageErrorCode, message: string) {
        super(message);
        this.name = 'StorageError';
    }
}
