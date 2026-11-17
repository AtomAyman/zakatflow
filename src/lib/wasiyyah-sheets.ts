import { GoogleSpreadsheet } from 'google-spreadsheet';
import { type WasiyyahData, DEFAULT_WASIYYAH, WASIYYAH_KEYS } from './wasiyyah-types';

// Stored in a "Wasiyyah" tab as Key | Value(JSON) rows, one per section.
// The tab is created lazily so existing spreadsheets need no migration.

const TAB = 'Wasiyyah';
const HEADERS = ['Key', 'Value'];

async function getSheet(spreadsheetId: string, accessToken: string) {
    const doc = new GoogleSpreadsheet(spreadsheetId, { token: accessToken });
    await doc.loadInfo();
    return doc.sheetsByTitle[TAB] ?? (await doc.addSheet({ title: TAB, headerValues: HEADERS }));
}

export async function getWasiyyah(spreadsheetId: string, accessToken: string): Promise<WasiyyahData> {
    const sheet = await getSheet(spreadsheetId, accessToken);
    const rows = await sheet.getRows();
    const data: WasiyyahData = structuredClone(DEFAULT_WASIYYAH);

    for (const row of rows) {
        const key = row.get('Key') as keyof WasiyyahData;
        if (!WASIYYAH_KEYS.includes(key)) continue;
        try {
            (data as unknown as Record<string, unknown>)[key] = JSON.parse(row.get('Value'));
        } catch {
            // Ignore a hand-edited cell that is no longer valid JSON; keep the default.
        }
    }
    return data;
}

export async function saveWasiyyah(
    spreadsheetId: string,
    accessToken: string,
    data: WasiyyahData
): Promise<void> {
    const sheet = await getSheet(spreadsheetId, accessToken);
    const rows = await sheet.getRows();
    const byKey = new Map(rows.map((r) => [r.get('Key') as string, r]));
    const toAdd: Record<string, string>[] = [];

    for (const key of WASIYYAH_KEYS) {
        const value = JSON.stringify(data[key] ?? DEFAULT_WASIYYAH[key]);
        const row = byKey.get(key);
        if (!row) {
            toAdd.push({ Key: key, Value: value });
        } else if (row.get('Value') !== value) {
            row.set('Value', value);
            await row.save();
        }
    }
    if (toAdd.length) await sheet.addRows(toAdd);
}
