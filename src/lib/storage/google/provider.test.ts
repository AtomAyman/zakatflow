import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeGoogle } from './fake-google';
import { GoogleSheetsProvider } from './provider';
import { ASSETS_TAB, SUMMARY_TITLE } from '../schema';
import { META_LAST_BACKUP, META_SCHEMA_VERSION } from './requests';
import type { Asset } from '../../types';

let google: FakeGoogle;
let provider: GoogleSheetsProvider;

beforeEach(() => {
    google = new FakeGoogle();
    vi.stubGlobal('fetch', google.fetch);
    provider = new GoogleSheetsProvider('token');
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const asset = (id: string, overrides: Partial<Asset> = {}): Asset => ({
    id, zakatYear: '2026', type: 'Gold', name: 'Ring', currency: 'USD', grossValue: 500,
    zakatMethod: 'Market', valuationPercent: 100, isJewelry: true, isETF: false,
    deductibleTaxPenalty: 0, netZakatableValue: 500, ...overrides,
});

/** The kind of sheet the previous version of the app created. */
function legacySheet() {
    return google.addLegacySpreadsheet('My_Zakat_Dashboard', {
        Settings: [
            ['Madhab', 'Nisab_Standard', 'Calculation_Basis', 'Base_Currency'],
            ['Shafi', 'Silver', 'Hijri', 'CAD'],
        ],
        Assets: [
            ['ID', 'Zakat_Year', 'Type', 'Name', 'Currency', 'Gross_Value', 'Zakat_Method', 'Valuation_Percent', 'Is_Jewelry'],
            ['a1', '2025', 'Debt_Receivable', 'Loan to Ali', 'CAD', 1500, 'Market', 100, 'false'],
            ['', '', 'Cash', 'Typed in by hand', 'CAD', 40, '', '', ''],
        ],
        Liabilities: [
            ['ID', 'Zakat_Year', 'Type', 'Name', 'Currency', 'Total_Amount', 'Monthly_Payment', 'Is_Immediate'],
        ],
        History: [
            ['Year', 'Date_Finalized', 'Total_Assets', 'Total_Liabilities', 'Net_Zakatable', 'Nisab_Threshold_Used', 'Zakat_Paid', 'Recipients_List'],
            ['2024', '2024-04-01', 9000, 0, 9000, 500, 225, 'Masjid'],
        ],
    });
}

describe('load', () => {
    it('creates and lays out a new spreadsheet for a first-time user', async () => {
        const result = await provider.load();
        const file = google.files.get(result.file.id)!;

        expect(file.appProperties.zakatApp).toBe('primary');
        expect(file.sheets.map((s) => s.title).sort()).toEqual(
            ['Assets', 'Donations', 'History', 'Liabilities', 'Settings', SUMMARY_TITLE].sort()
        );
        expect(file.sheets.find((s) => s.title === 'Sheet1')).toBeUndefined();
        expect(google.sheet(result.file.id, 'Assets')!.values[0]).toEqual(ASSETS_TAB.columns.map((c) => c.header));
        expect(result.data.settings.madhab).toBe('Hanafi');
        expect(result.data.assets).toEqual([]);
        expect(result.summaryStale).toBe(true);
        expect(file.metadata.find((m) => m.metadataKey === META_SCHEMA_VERSION)?.metadataValue).toBe('2');

        // Every data tab is protected with a warning, and the ID column is hidden.
        expect(google.sheet(result.file.id, 'Assets')!.protectedRanges).toHaveLength(1);
        expect(google.sheet(result.file.id, 'Assets')!.hiddenColumns.has(0)).toBe(true);
    });

    it('finds the same file on the next visit instead of creating another', async () => {
        const first = await provider.load();
        const second = await provider.load();
        expect(second.file.id).toBe(first.file.id);
        expect(second.summaryStale).toBe(false);
        expect(google.files.size).toBe(1);
    });

    it('upgrades an old spreadsheet in place without losing data', async () => {
        const id = legacySheet();
        const result = await provider.load();

        expect(result.file.id).toBe(id);
        expect(google.files.get(id)!.appProperties.zakatApp).toBe('primary');
        expect(result.summaryStale).toBe(true);

        // Data survives, with old text values converted.
        expect(result.data.settings).toMatchObject({ madhab: 'Shafi', nisabStandard: 'Silver', baseCurrency: 'CAD' });
        expect(result.data.history).toEqual([
            expect.objectContaining({ year: '2024', zakatPaid: 225, recipientsList: 'Masjid' }),
        ]);
        const loan = result.data.assets.find((a) => a.id === 'a1')!;
        expect(loan).toMatchObject({ type: 'Debt_Receivable', grossValue: 1500, zakatYear: '2025', isJewelry: false });

        // A row typed straight into the sheet gets an ID and year.
        const typed = result.data.assets.find((a) => a.name === 'Typed in by hand')!;
        expect(typed.id).toBeTruthy();
        expect(typed.zakatYear).toBe(new Date().getFullYear().toString());

        // Headers are renamed, new tabs exist, labels and real booleans are written.
        const assets = google.sheet(id, 'Assets')!;
        expect(assets.values[0].slice(0, 6)).toEqual(['ID', 'Zakat Year', 'Type', 'Name', 'Currency', 'Value']);
        expect(assets.values[1][2]).toBe('Money Owed to You');
        expect(assets.values[1][8]).toBe(false);
        expect(google.sheet(id, 'Donations')).toBeDefined();
        expect(google.sheet(id, SUMMARY_TITLE)).toBeDefined();

        // Upgrading only happens once.
        const again = await provider.load();
        expect(again.summaryStale).toBe(false);
        expect(again.data.assets).toHaveLength(2);
    });

    it('keeps columns the user added themselves', async () => {
        const id = google.addLegacySpreadsheet('My_Zakat_Dashboard', {
            Assets: [
                ['ID', 'Name', 'My notes'],
                ['a1', 'Savings', 'for Hajj'],
            ],
        });
        await provider.load();
        const assets = google.sheet(id, 'Assets')!;
        expect(assets.values[0].slice(0, 3)).toEqual(['ID', 'Name', 'My notes']);
        expect(assets.values[1][2]).toBe('for Hajj');
    });
});

describe('applyChanges', () => {
    it('adds, updates and deletes in a single batch and fills the Summary', async () => {
        const { file } = await provider.load();
        await provider.applyChanges(file.id, [
            { entity: 'assets', action: 'upsert', record: asset('x1') },
            { entity: 'assets', action: 'upsert', record: asset('x2', { name: 'Coins' }) },
        ]);

        google.calls = [];
        await provider.applyChanges(
            file.id,
            [
                { entity: 'assets', action: 'upsert', record: asset('x1', { name: 'Wedding ring' }) },
                { entity: 'assets', action: 'delete', key: 'x2' },
                { entity: 'donations', action: 'upsert', record: { id: 'd1', zakatYear: '2026', date: '2026-03-01', amount: 120, recipient: 'Food bank', notes: '', category: 'Zakat' } },
            ],
            {
                baseCurrency: 'USD',
                years: [{ year: '2026', totalAssets: 500, notZakatable: 0, debtsDeducted: 0, netZakatable: 500, nisab: 400, aboveNisab: true, zakatDue: 12.5 }],
            }
        );

        // Metadata read + values read + one write.
        expect(google.calls).toHaveLength(3);

        const reloaded = await provider.load();
        expect(reloaded.data.assets).toEqual([expect.objectContaining({ id: 'x1', name: 'Wedding ring', isJewelry: true })]);
        expect(reloaded.data.donations).toEqual([expect.objectContaining({ id: 'd1', amount: 120, category: 'Zakat' })]);

        const summary = google.sheet(file.id, SUMMARY_TITLE)!.values;
        expect(summary[5][0]).toBe(2026);
        expect(summary[5][7]).toBe(12.5);
        expect(String(summary[5][8])).toContain('SUMIFS');
    });

    it('repairs a deleted tab or column automatically before saving', async () => {
        const { file } = await provider.load();
        const f = google.files.get(file.id)!;
        f.sheets = f.sheets.filter((s) => s.title !== 'Donations');
        google.sheet(file.id, 'Assets')!.values[0][5] = 'Something else';

        await provider.applyChanges(file.id, [
            { entity: 'assets', action: 'upsert', record: asset('x1', { grossValue: 900 }) },
            { entity: 'donations', action: 'upsert', record: { id: 'd1', zakatYear: '2026', date: '2026-03-01', amount: 5, recipient: 'x', notes: '', category: 'Sadaqah' } },
        ]);

        const reloaded = await provider.load();
        expect(reloaded.data.assets[0].grossValue).toBe(900);
        expect(reloaded.data.donations).toHaveLength(1);
    });

    it('turns an expired token into a reconnect error', async () => {
        vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { message: 'Invalid Credentials' } }), { status: 401 }));
        await expect(provider.load()).rejects.toMatchObject({ code: 'REAUTH' });
    });
});

describe('repair', () => {
    it('restores missing pieces and is safe to run repeatedly', async () => {
        const { file } = await provider.load();
        await provider.applyChanges(file.id, [{ entity: 'assets', action: 'upsert', record: asset('x1') }]);
        const f = google.files.get(file.id)!;
        f.sheets = f.sheets.filter((s) => s.title !== 'History');

        const report = await provider.repair(file.id);
        expect(report.tabsCreated).toEqual(['History']);
        const second = await provider.repair(file.id);
        expect(second.tabsCreated).toEqual([]);

        expect(google.sheet(file.id, 'Assets')!.protectedRanges).toHaveLength(1);
        expect((await provider.load()).data.assets).toHaveLength(1);
    });
});

describe('backups', () => {
    it('keeps one rolling weekly backup and trashes the previous one', async () => {
        const { file } = await provider.load();
        const backups = () => [...google.files.values()].filter((f) => f.appProperties.zakatApp === 'backup');
        const lastBackup = () => google.files.get(file.id)!.metadata.find((m) => m.metadataKey === META_LAST_BACKUP)!;
        const aWeekAgo = () => new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();

        await provider.load(); // brand-new sheet: nothing to back up yet
        expect(backups()).toHaveLength(0);

        lastBackup().metadataValue = aWeekAgo();
        await provider.load(); // first backup
        expect(backups()).toHaveLength(1);
        const firstBackup = backups()[0].id;

        await provider.load(); // within a week: no new backup
        expect(backups()).toHaveLength(1);

        lastBackup().metadataValue = aWeekAgo();
        await provider.load();

        expect(backups()).toHaveLength(2);
        expect(google.files.get(firstBackup)!.trashed).toBe(true);
        // The backup is never mistaken for the main file.
        expect((await provider.load()).file.id).toBe(file.id);
    });
});
