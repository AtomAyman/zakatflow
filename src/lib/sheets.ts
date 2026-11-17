import { GoogleSpreadsheet } from 'google-spreadsheet';
import { type Settings, type Asset, type Liability, type HistoryEntry, type DonationEntry, DEFAULT_SETTINGS } from './types';
import { v4 as uuid } from 'uuid';

const SPREADSHEET_TITLE_PRIMARY = 'My_Zakat_Dashboard';
const SPREADSHEET_TITLE_BACKUP = 'My_Zakat_Dashboard_Backup';

// ─── Helpers ──────────────────────────────────────────────

async function findSpreadsheet(accessToken: string, title: string = SPREADSHEET_TITLE_PRIMARY): Promise<string | null> {
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }
    return null;
}

// ─── Tab layouts ──────────────────────────────────────────
// Columns are only ever appended (never renamed or reordered) so existing
// users' sheets can be upgraded in place by ensureSchema().

const SETTINGS_HEADERS = [
    'Madhab',
    'Nisab_Standard',
    'Calculation_Basis',
    'Base_Currency',
    'Anniversary_Hijri',
    'Income_Level',
    'State_Province',
    'Under_Retirement_Age',
];

const ASSET_HEADERS = [
    'ID',
    'Zakat_Year',
    'Type',
    'Name',
    'Currency',
    'Gross_Value',
    'Zakat_Method',
    'Valuation_Percent',
    'Stock_Holding_Type',
    'Zakatable_Asset_Percent',
    'Retirement_Type',
    'Crypto_Intent',
    'Debt_Strength',
    'Ticker',
    'Quantity',
    'Gold_Purity',
    'Weight_Grams',
    'Weight_Unit',
    'Is_Jewelry',
    'Is_ETF',
    'Deductible_Tax_Penalty',
    'Net_Zakatable_Value',
    'Retirement_Account_Type',
];

const LIABILITY_HEADERS = [
    'ID',
    'Zakat_Year',
    'Type',
    'Name',
    'Currency',
    'Total_Amount',
    'Monthly_Payment',
    'Is_Immediate',
];

const HISTORY_HEADERS = [
    'Year',
    'Date_Finalized',
    'Total_Assets',
    'Total_Liabilities',
    'Net_Zakatable',
    'Nisab_Threshold_Used',
    'Zakat_Paid',
    'Recipients_List',
];

const DONATION_HEADERS = [
    'ID',
    'Zakat_Year',
    'Date',
    'Category',
    'Amount',
    'Recipient',
    'Notes',
];

const SCHEMA: { title: string; headers: string[] }[] = [
    { title: 'Settings', headers: SETTINGS_HEADERS },
    { title: 'Assets', headers: ASSET_HEADERS },
    { title: 'Liabilities', headers: LIABILITY_HEADERS },
    { title: 'History', headers: HISTORY_HEADERS },
    { title: 'Donations', headers: DONATION_HEADERS },
];

function getDoc(spreadsheetId: string, accessToken: string): GoogleSpreadsheet {
    const doc = new GoogleSpreadsheet(spreadsheetId, {
        token: accessToken,
    });
    return doc;
}

async function createSpreadsheet(accessToken: string, title: string): Promise<string> {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: { title },
            sheets: SCHEMA.map((tab, index) => ({ properties: { title: tab.title, index } })),
        }),
    });

    const spreadsheet = await createRes.json();
    if (!createRes.ok || !spreadsheet.spreadsheetId) {
        throw new Error(`Failed to create spreadsheet: ${spreadsheet?.error?.message || createRes.status}`);
    }
    const spreadsheetId: string = spreadsheet.spreadsheetId;

    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    for (const tab of SCHEMA) {
        await doc.sheetsByTitle[tab.title].setHeaderRow(tab.headers);
    }

    await doc.sheetsByTitle['Settings'].addRow(settingsToRow(DEFAULT_SETTINGS));

    return spreadsheetId;
}

/**
 * Bring an existing spreadsheet up to the current layout without touching
 * user data: creates missing tabs and appends missing columns to the end of
 * each header row.
 */
async function ensureSchema(spreadsheetId: string, accessToken: string): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();

    for (const tab of SCHEMA) {
        let sheet = doc.sheetsByTitle[tab.title];
        if (!sheet) {
            sheet = await doc.addSheet({ title: tab.title, headerValues: tab.headers });
            if (tab.title === 'Settings') {
                await sheet.addRow(settingsToRow(DEFAULT_SETTINGS));
            }
            continue;
        }

        let existing: string[] = [];
        try {
            await sheet.loadHeaderRow();
            existing = sheet.headerValues;
        } catch {
            // Empty header row — treat as a blank tab.
        }

        const missing = tab.headers.filter((h) => !existing.includes(h));
        if (missing.length === 0) continue;

        const merged = [...existing, ...missing];
        if (merged.length > sheet.columnCount) {
            await sheet.resize({ rowCount: sheet.rowCount, columnCount: merged.length });
        }
        await sheet.setHeaderRow(merged);
    }
}

// ─── Initialize Sheet ─────────────────────────────────────

export async function initializeSheet(accessToken: string): Promise<{ spreadsheetId: string; backupSpreadsheetId: string }> {
    // Check or create primary sheet
    let spreadsheetId = await findSpreadsheet(accessToken, SPREADSHEET_TITLE_PRIMARY);
    if (!spreadsheetId) {
        spreadsheetId = await createSpreadsheet(accessToken, SPREADSHEET_TITLE_PRIMARY);
    } else {
        await ensureSchema(spreadsheetId, accessToken);
    }

    // Check or create backup sheet
    let backupSpreadsheetId = await findSpreadsheet(accessToken, SPREADSHEET_TITLE_BACKUP);
    if (!backupSpreadsheetId) {
        backupSpreadsheetId = await createSpreadsheet(accessToken, SPREADSHEET_TITLE_BACKUP);
    } else {
        await ensureSchema(backupSpreadsheetId, accessToken).catch((e) =>
            console.error('Backup ensureSchema error:', e)
        );
    }

    return { spreadsheetId, backupSpreadsheetId };
}

// ─── Settings CRUD ────────────────────────────────────────

function settingsToRow(settings: Settings): Record<string, string | number> {
    return {
        Madhab: settings.madhab,
        Nisab_Standard: settings.nisabStandard,
        Calculation_Basis: settings.calculationBasis,
        Base_Currency: settings.baseCurrency,
        Anniversary_Hijri: settings.anniversaryHijri ?? '',
        Income_Level: settings.incomeLevel ?? '',
        State_Province: settings.stateProvince ?? '',
        Under_Retirement_Age:
            settings.isUnderRetirementAge === undefined
                ? ''
                : settings.isUnderRetirementAge ? 'true' : 'false',
    };
}

export async function getSettings(
    spreadsheetId: string,
    accessToken: string
): Promise<Settings> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Settings'];
    const rows = await sheet.getRows();

    if (rows.length === 0) return DEFAULT_SETTINGS;

    const row = rows[0];
    const text = (key: string) => String(row.get(key) ?? '').trim();

    const income = text('Income_Level');
    const underRetirement = text('Under_Retirement_Age').toLowerCase();

    return {
        madhab: (text('Madhab') || DEFAULT_SETTINGS.madhab) as Settings['madhab'],
        nisabStandard: (text('Nisab_Standard') || DEFAULT_SETTINGS.nisabStandard) as Settings['nisabStandard'],
        calculationBasis: (text('Calculation_Basis') || DEFAULT_SETTINGS.calculationBasis) as Settings['calculationBasis'],
        baseCurrency: text('Base_Currency') || DEFAULT_SETTINGS.baseCurrency,
        anniversaryHijri: text('Anniversary_Hijri') || undefined,
        incomeLevel: income && Number.isFinite(Number(income)) ? Number(income) : undefined,
        stateProvince: text('State_Province') || undefined,
        isUnderRetirementAge:
            underRetirement === ''
                ? DEFAULT_SETTINGS.isUnderRetirementAge
                : underRetirement === 'true',
    };
}

export async function saveSettings(
    spreadsheetId: string,
    accessToken: string,
    settings: Settings
): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Settings'];
    const rows = await sheet.getRows();
    const values = settingsToRow(settings);

    if (rows.length === 0) {
        await sheet.addRow(values);
    } else {
        const row = rows[0];
        for (const [key, value] of Object.entries(values)) {
            row.set(key, value);
        }
        await row.save();
    }
}

// ─── Assets CRUD ──────────────────────────────────────────

export async function getAssets(
    spreadsheetId: string,
    accessToken: string
): Promise<Asset[]> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Assets'];
    const rows = await sheet.getRows();

    const rowsToSave: any[] = [];

    const assets = rows.map((row) => {
        let needsSave = false;
        let id = row.get('ID');
        if (!id) {
            id = uuid();
            row.set('ID', id);
            needsSave = true;
        }

        let zakatYear = row.get('Zakat_Year');
        if (!zakatYear) {
            zakatYear = new Date().getFullYear().toString();
            row.set('Zakat_Year', zakatYear);
            needsSave = true;
        }

        if (needsSave) {
            rowsToSave.push(row);
        }

        return {
            id,
            zakatYear,
            type: row.get('Type') as Asset['type'],
            name: row.get('Name') || '',
            currency: row.get('Currency') || 'USD',
            grossValue: Number(row.get('Gross_Value')) || 0,
            zakatMethod: (row.get('Zakat_Method') || 'Market') as Asset['zakatMethod'],
            valuationPercent: Number(row.get('Valuation_Percent')) || 100,
            stockHoldingType: (row.get('Stock_Holding_Type') || '').trim() || undefined,
            zakatableAssetPercent: row.get('Zakatable_Asset_Percent') ? Number(row.get('Zakatable_Asset_Percent')) : undefined,
            retirementType: (row.get('Retirement_Type') || '').trim() || undefined,
            retirementAccountType: (row.get('Retirement_Account_Type') || '').trim() || undefined,
            cryptoIntent: (row.get('Crypto_Intent') || '').trim() || undefined,
            debtStrength: (row.get('Debt_Strength') || '').trim() || undefined,
            ticker: (row.get('Ticker') || '').trim() || undefined,
            quantity: row.get('Quantity') ? Number(row.get('Quantity')) : undefined,
            goldPurity: row.get('Gold_Purity') ? Number(row.get('Gold_Purity')) : undefined,
            weightGrams: row.get('Weight_Grams') ? Number(row.get('Weight_Grams')) : undefined,
            weightUnit: (row.get('Weight_Unit') || '').trim() || undefined,
            isJewelry: String(row.get('Is_Jewelry') || '').toLowerCase() === 'true',
            isETF: String(row.get('Is_ETF') || '').toLowerCase() === 'true',
            deductibleTaxPenalty: Number(row.get('Deductible_Tax_Penalty')) || 0,
            netZakatableValue: Number(row.get('Net_Zakatable_Value')) || 0,
        };
    });

    if (rowsToSave.length > 0) {
        // Google Sheets API has rate limits, let's do this sequentially to be safe
        for (const row of rowsToSave) {
            await row.save();
        }
    }

    return assets;
}

export async function addAsset(
    spreadsheetId: string,
    accessToken: string,
    asset: Omit<Asset, 'id'>
): Promise<Asset> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Assets'];
    const id = uuid();

    await sheet.addRow({
        ID: id,
        Zakat_Year: asset.zakatYear || new Date().getFullYear().toString(),
        Type: asset.type,
        Name: asset.name,
        Currency: asset.currency,
        Gross_Value: asset.grossValue,
        Zakat_Method: asset.zakatMethod,
        Valuation_Percent: asset.valuationPercent,
        Stock_Holding_Type: asset.stockHoldingType || '',
        Zakatable_Asset_Percent: asset.zakatableAssetPercent ?? '',
        Retirement_Type: asset.retirementType || '',
        Retirement_Account_Type: asset.retirementAccountType || '',
        Crypto_Intent: asset.cryptoIntent || '',
        Debt_Strength: asset.debtStrength || '',
        Ticker: asset.ticker || '',
        Quantity: asset.quantity ?? '',
        Gold_Purity: asset.goldPurity ?? '',
        Weight_Grams: asset.weightGrams ?? '',
        Weight_Unit: asset.weightUnit || '',
        Is_Jewelry: asset.isJewelry ? 'true' : 'false',
        Is_ETF: asset.isETF ? 'true' : 'false',
        Deductible_Tax_Penalty: asset.deductibleTaxPenalty,
        Net_Zakatable_Value: asset.netZakatableValue,
    });

    return { id, ...asset };
}

export async function deleteAsset(
    spreadsheetId: string,
    accessToken: string,
    assetId: string
): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Assets'];
    const rows = await sheet.getRows();
    const row = rows.find((r) => r.get('ID') === assetId);
    if (row) await row.delete();
}

export async function updateAsset(
    spreadsheetId: string,
    accessToken: string,
    asset: Asset
): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Assets'];
    const rows = await sheet.getRows();
    const row = rows.find((r) => r.get('ID') === asset.id);
    if (!row) return;

    row.set('Zakat_Year', asset.zakatYear || new Date().getFullYear().toString());
    row.set('Type', asset.type);
    row.set('Name', asset.name);
    row.set('Currency', asset.currency);
    row.set('Gross_Value', asset.grossValue);
    row.set('Zakat_Method', asset.zakatMethod);
    row.set('Valuation_Percent', asset.valuationPercent);
    row.set('Stock_Holding_Type', asset.stockHoldingType || '');
    row.set('Zakatable_Asset_Percent', asset.zakatableAssetPercent ?? '');
    row.set('Retirement_Type', asset.retirementType || '');
    row.set('Retirement_Account_Type', asset.retirementAccountType || '');
    row.set('Crypto_Intent', asset.cryptoIntent || '');
    row.set('Debt_Strength', asset.debtStrength || '');
    row.set('Ticker', asset.ticker || '');
    row.set('Quantity', asset.quantity ?? '');
    row.set('Gold_Purity', asset.goldPurity ?? '');
    row.set('Weight_Grams', asset.weightGrams ?? '');
    row.set('Weight_Unit', asset.weightUnit || '');
    row.set('Is_Jewelry', asset.isJewelry ? 'true' : 'false');
    row.set('Is_ETF', asset.isETF ? 'true' : 'false');
    row.set('Deductible_Tax_Penalty', asset.deductibleTaxPenalty);
    row.set('Net_Zakatable_Value', asset.netZakatableValue);
    await row.save();
}

// ─── Liabilities CRUD ────────────────────────────────────

export async function getLiabilities(
    spreadsheetId: string,
    accessToken: string
): Promise<Liability[]> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Liabilities'];
    const rows = await sheet.getRows();

    const rowsToSave: any[] = [];

    const liabilities = rows.map((row) => {
        let needsSave = false;
        let id = row.get('ID');
        if (!id) {
            id = uuid();
            row.set('ID', id);
            needsSave = true;
        }

        let zakatYear = row.get('Zakat_Year');
        if (!zakatYear) {
            zakatYear = new Date().getFullYear().toString();
            row.set('Zakat_Year', zakatYear);
            needsSave = true;
        }

        if (needsSave) {
            rowsToSave.push(row);
        }

        return {
            id,
            zakatYear,
            type: row.get('Type') as Liability['type'],
            name: row.get('Name') || '',
            currency: row.get('Currency') || 'USD',
            totalAmount: Number(row.get('Total_Amount')) || 0,
            monthlyPayment: Number(row.get('Monthly_Payment')) || 0,
            isImmediate: String(row.get('Is_Immediate') || '').toLowerCase() === 'true',
        };
    });

    if (rowsToSave.length > 0) {
        // Google Sheets API has rate limits, let's do this sequentially to be safe
        for (const row of rowsToSave) {
            await row.save();
        }
    }

    return liabilities;
}

export async function addLiability(
    spreadsheetId: string,
    accessToken: string,
    liability: Omit<Liability, 'id'>
): Promise<Liability> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Liabilities'];
    const id = uuid();

    await sheet.addRow({
        ID: id,
        Zakat_Year: liability.zakatYear || new Date().getFullYear().toString(),
        Type: liability.type,
        Name: liability.name,
        Currency: liability.currency,
        Total_Amount: liability.totalAmount,
        Monthly_Payment: liability.monthlyPayment,
        Is_Immediate: liability.isImmediate ? 'true' : 'false',
    });

    return { id, ...liability };
}

export async function deleteLiability(
    spreadsheetId: string,
    accessToken: string,
    liabilityId: string
): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Liabilities'];
    const rows = await sheet.getRows();
    const row = rows.find((r) => r.get('ID') === liabilityId);
    if (row) await row.delete();
}

export async function updateLiability(
    spreadsheetId: string,
    accessToken: string,
    liability: Liability
): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Liabilities'];
    const rows = await sheet.getRows();
    const row = rows.find((r) => r.get('ID') === liability.id);
    if (!row) return;

    row.set('Zakat_Year', liability.zakatYear || new Date().getFullYear().toString());
    row.set('Type', liability.type);
    row.set('Name', liability.name);
    row.set('Currency', liability.currency);
    row.set('Total_Amount', liability.totalAmount);
    row.set('Monthly_Payment', liability.monthlyPayment);
    row.set('Is_Immediate', liability.isImmediate ? 'true' : 'false');
    await row.save();
}

// ─── History ──────────────────────────────────────────────

export async function getHistory(
    spreadsheetId: string,
    accessToken: string
): Promise<HistoryEntry[]> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['History'];
    const rows = await sheet.getRows();

    return rows.map((row) => ({
        year: row.get('Year') || '',
        dateFinalized: row.get('Date_Finalized') || '',
        totalAssets: Number(row.get('Total_Assets')) || 0,
        totalLiabilities: Number(row.get('Total_Liabilities')) || 0,
        netZakatable: Number(row.get('Net_Zakatable')) || 0,
        nisabThresholdUsed: Number(row.get('Nisab_Threshold_Used')) || 0,
        zakatPaid: Number(row.get('Zakat_Paid')) || 0,
        recipientsList: row.get('Recipients_List') || '',
    }));
}

export async function addHistoryEntry(
    spreadsheetId: string,
    accessToken: string,
    entry: HistoryEntry
): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['History'];

    await sheet.addRow({
        Year: entry.year,
        Date_Finalized: entry.dateFinalized,
        Total_Assets: entry.totalAssets,
        Total_Liabilities: entry.totalLiabilities,
        Net_Zakatable: entry.netZakatable,
        Nisab_Threshold_Used: entry.nisabThresholdUsed,
        Zakat_Paid: entry.zakatPaid,
        Recipients_List: entry.recipientsList,
    });
}

// ─── Donations ────────────────────────────────────────────

const DONATION_CATEGORIES: DonationEntry['category'][] = ['Zakat', 'Sadaqah', 'Other'];

export async function getDonations(
    spreadsheetId: string,
    accessToken: string
): Promise<DonationEntry[]> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Donations'];
    if (!sheet) return [];
    const rows = await sheet.getRows();

    return rows
        .filter((row) => row.get('ID'))
        .map((row) => {
            const category = row.get('Category') as DonationEntry['category'];
            return {
                id: row.get('ID'),
                zakatYear: row.get('Zakat_Year') || '',
                date: row.get('Date') || '',
                category: DONATION_CATEGORIES.includes(category) ? category : 'Other',
                amount: Number(row.get('Amount')) || 0,
                recipient: row.get('Recipient') || '',
                notes: row.get('Notes') || '',
            };
        });
}

export async function addDonation(
    spreadsheetId: string,
    accessToken: string,
    donation: DonationEntry
): Promise<DonationEntry> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Donations'];

    const entry: DonationEntry = { ...donation, id: donation.id || uuid() };
    await sheet.addRow({
        ID: entry.id,
        Zakat_Year: entry.zakatYear || new Date().getFullYear().toString(),
        Date: entry.date,
        Category: entry.category,
        Amount: entry.amount,
        Recipient: entry.recipient,
        Notes: entry.notes || '',
    });

    return entry;
}

export async function deleteDonation(
    spreadsheetId: string,
    accessToken: string,
    donationId: string
): Promise<void> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Donations'];
    if (!sheet) return;
    const rows = await sheet.getRows();
    const row = rows.find((r) => r.get('ID') === donationId);
    if (row) await row.delete();
}
