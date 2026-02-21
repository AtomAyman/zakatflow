import { GoogleSpreadsheet } from 'google-spreadsheet';
import { type Settings, type Asset, type Liability, type HistoryEntry, DEFAULT_SETTINGS } from './types';
import { v4 as uuid } from 'uuid';

const SPREADSHEET_TITLE = 'My_Zakat_Dashboard';

// ─── Helpers ──────────────────────────────────────────────

async function findSpreadsheet(accessToken: string): Promise<string | null> {
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }
    return null;
}

function getDoc(spreadsheetId: string, accessToken: string): GoogleSpreadsheet {
    const doc = new GoogleSpreadsheet(spreadsheetId, {
        token: accessToken,
    });
    return doc;
}

// ─── Initialize Sheet ─────────────────────────────────────

export async function initializeSheet(accessToken: string): Promise<string> {
    // Check if sheet already exists
    const existingId = await findSpreadsheet(accessToken);
    if (existingId) return existingId;

    // Create new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: { title: SPREADSHEET_TITLE },
            sheets: [
                { properties: { title: 'Settings', index: 0 } },
                { properties: { title: 'Assets', index: 1 } },
                { properties: { title: 'Liabilities', index: 2 } },
                { properties: { title: 'History', index: 3 } },
            ],
        }),
    });

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Add header rows
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();

    // Settings tab
    const settingsSheet = doc.sheetsByTitle['Settings'];
    await settingsSheet.setHeaderRow([
        'Madhab',
        'Nisab_Standard',
        'Calculation_Basis',
        'Base_Currency',
    ]);
    await settingsSheet.addRow({
        Madhab: DEFAULT_SETTINGS.madhab,
        Nisab_Standard: DEFAULT_SETTINGS.nisabStandard,
        Calculation_Basis: DEFAULT_SETTINGS.calculationBasis,
        Base_Currency: DEFAULT_SETTINGS.baseCurrency,
    });

    // Assets tab
    const assetsSheet = doc.sheetsByTitle['Assets'];
    await assetsSheet.setHeaderRow([
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
    ]);

    // Liabilities tab
    const liabilitiesSheet = doc.sheetsByTitle['Liabilities'];
    await liabilitiesSheet.setHeaderRow([
        'ID',
        'Zakat_Year',
        'Type',
        'Name',
        'Currency',
        'Total_Amount',
        'Monthly_Payment',
        'Is_Immediate',
    ]);

    // History tab
    const historySheet = doc.sheetsByTitle['History'];
    await historySheet.setHeaderRow([
        'Year',
        'Date_Finalized',
        'Total_Assets',
        'Total_Liabilities',
        'Net_Zakatable',
        'Nisab_Threshold_Used',
        'Zakat_Paid',
        'Recipients_List',
    ]);

    return spreadsheetId;
}

// ─── Settings CRUD ────────────────────────────────────────

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
    return {
        madhab: (row.get('Madhab') || DEFAULT_SETTINGS.madhab) as Settings['madhab'],
        nisabStandard: (row.get('Nisab_Standard') || DEFAULT_SETTINGS.nisabStandard) as Settings['nisabStandard'],
        calculationBasis: (row.get('Calculation_Basis') || DEFAULT_SETTINGS.calculationBasis) as Settings['calculationBasis'],
        baseCurrency: (row.get('Base_Currency') || DEFAULT_SETTINGS.baseCurrency),
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

    if (rows.length === 0) {
        await sheet.addRow({
            Madhab: settings.madhab,
            Nisab_Standard: settings.nisabStandard,
            Calculation_Basis: settings.calculationBasis,
            Base_Currency: settings.baseCurrency,
        });
    } else {
        const row = rows[0];
        row.set('Madhab', settings.madhab);
        row.set('Nisab_Standard', settings.nisabStandard);
        row.set('Calculation_Basis', settings.calculationBasis);
        row.set('Base_Currency', settings.baseCurrency);
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

    return rows.map((row) => ({
        id: row.get('ID') || uuid(),
        zakatYear: row.get('Zakat_Year') || new Date().getFullYear().toString(),
        type: row.get('Type') as Asset['type'],
        name: row.get('Name') || '',
        currency: row.get('Currency') || 'USD',
        grossValue: Number(row.get('Gross_Value')) || 0,
        zakatMethod: (row.get('Zakat_Method') || 'Market') as Asset['zakatMethod'],
        valuationPercent: Number(row.get('Valuation_Percent')) || 100,
        stockHoldingType: row.get('Stock_Holding_Type') || undefined,
        zakatableAssetPercent: row.get('Zakatable_Asset_Percent') ? Number(row.get('Zakatable_Asset_Percent')) : undefined,
        retirementType: row.get('Retirement_Type') || undefined,
        cryptoIntent: row.get('Crypto_Intent') || undefined,
        debtStrength: row.get('Debt_Strength') || undefined,
        ticker: row.get('Ticker') || undefined,
        quantity: row.get('Quantity') ? Number(row.get('Quantity')) : undefined,
        goldPurity: row.get('Gold_Purity') ? Number(row.get('Gold_Purity')) : undefined,
        weightGrams: row.get('Weight_Grams') ? Number(row.get('Weight_Grams')) : undefined,
        weightUnit: row.get('Weight_Unit') || undefined,
        isJewelry: row.get('Is_Jewelry') === 'true',
        isETF: row.get('Is_ETF') === 'true',
        deductibleTaxPenalty: Number(row.get('Deductible_Tax_Penalty')) || 0,
        netZakatableValue: Number(row.get('Net_Zakatable_Value')) || 0,
    }));
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

// ─── Liabilities CRUD ────────────────────────────────────

export async function getLiabilities(
    spreadsheetId: string,
    accessToken: string
): Promise<Liability[]> {
    const doc = getDoc(spreadsheetId, accessToken);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Liabilities'];
    const rows = await sheet.getRows();

    return rows.map((row) => ({
        id: row.get('ID') || uuid(),
        zakatYear: row.get('Zakat_Year') || new Date().getFullYear().toString(),
        type: row.get('Type') as Liability['type'],
        name: row.get('Name') || '',
        currency: row.get('Currency') || 'USD',
        totalAmount: Number(row.get('Total_Amount')) || 0,
        monthlyPayment: Number(row.get('Monthly_Payment')) || 0,
        isImmediate: row.get('Is_Immediate') === 'true',
    }));
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
