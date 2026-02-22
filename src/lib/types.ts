// ─── Enums ────────────────────────────────────────────────

export type Madhab = 'Hanafi' | 'Shafi' | 'Maliki' | 'Hanbali';
export type NisabStandard = 'Gold' | 'Silver';
export type CalcBasis = 'Hijri' | 'Gregorian';

// Common currencies — assets/liabilities can use any string code
export const CURRENCIES = [
  'USD', 'CAD', 'GBP', 'EUR', 'PKR', 'INR', 'SAR', 'AED', 'BDT', 'EGP', 'TRY', 'MYR',
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export type AssetType =
  | 'Cash'
  | 'Bank'
  | 'Stock'
  | 'Crypto'
  | 'Retirement'
  | 'Gold'
  | 'Silver'
  | 'Merchandise'
  | 'Debt_Receivable';

export type StockHoldingType = 'Short_Term' | 'Long_Term';
export type RetirementType = 'Mandatory' | 'Voluntary';
export type CryptoIntent = 'Currency' | 'Resale' | 'Platform_Token';
export type ZakatMethod = 'Market' | 'Passive_Proxy' | 'Manual';
export type WeightUnit = 'grams' | 'troy_oz' | 'tola';

export type LiabilityType =
  | 'Mortgage'
  | 'Utility_Bills'
  | 'Medical_Bills'
  | 'Credit_Balance'
  | 'Personal_Loan'
  | 'Student_Loan'
  | 'Commercial_Loan'
  | 'Dowry'
  | 'Salary_Service_Fee'
  | 'Other';

// ─── Settings ─────────────────────────────────────────────

export interface Settings {
  madhab: Madhab;
  nisabStandard: NisabStandard;
  calculationBasis: CalcBasis;
  baseCurrency: string; // any currency code
}

export const DEFAULT_SETTINGS: Settings = {
  madhab: 'Hanafi',
  nisabStandard: 'Gold',
  calculationBasis: 'Hijri',
  baseCurrency: 'USD',
};

// ─── Assets ───────────────────────────────────────────────

export interface Asset {
  id: string;
  zakatYear: string;          // e.g. "2025" — which Zakat year this asset belongs to
  type: AssetType;
  name: string;
  currency: string;           // currency code for this asset
  grossValue: number;         // value in asset's own currency
  zakatMethod: ZakatMethod;
  valuationPercent: number;   // 100 for Market, custom for others

  // Stock-specific
  stockHoldingType?: StockHoldingType;
  ticker?: string;
  quantity?: number;
  zakatableAssetPercent?: number; // for long-term: % of company assets that are zakatable

  // Retirement-specific
  retirementType?: RetirementType;

  // Gold/Silver-specific
  goldPurity?: number;        // 24, 22, 18
  weightGrams?: number;       // weight stored in grams (converted from any unit)
  weightUnit?: WeightUnit;    // original input unit
  isJewelry?: boolean;
  isETF?: boolean;            // Gold/Silver ETF — use direct dollar value, no weight

  // Crypto-specific
  cryptoIntent?: CryptoIntent;

  // Debt receivable
  debtStrength?: 'Strong' | 'Weak' | 'Intermediate';

  // Computed (in base currency)
  deductibleTaxPenalty: number;
  netZakatableValue: number;
}

// ─── Liabilities ──────────────────────────────────────────

export interface Liability {
  id: string;
  zakatYear: string;          // e.g. "2025"
  type: LiabilityType;
  name: string;
  currency: string;
  totalAmount: number;
  monthlyPayment: number;
  isImmediate?: boolean;     // for short-term/immediate debts
}

// ─── History ──────────────────────────────────────────────

export interface HistoryEntry {
  year: string;
  dateFinalized: string;
  totalAssets: number;
  totalLiabilities: number;
  netZakatable: number;
  nisabThresholdUsed: number;
  zakatPaid: number;
  recipientsList: string;
}

// ─── Dashboard Summary ───────────────────────────────────

export interface DashboardSummary {
  totalGrossAssets: number;
  totalDeductions: number;
  totalNetZakatableAssets: number;
  totalLiabilities: number;
  liabilityDeduction: number;
  netZakatableWealth: number;
  nisabThreshold: number;
  isAboveNisab: boolean;
  zakatRate: number;
  zakatDue: number;
  assetBreakdown: { type: AssetType; value: number; color: string }[];
}

// ─── Price Data ──────────────────────────────────────────

export interface PriceData {
  goldPerGram: number;        // in USD
  silverPerGram: number;      // in USD
  exchangeRates: Record<string, number>; // rates to USD (e.g. { CAD: 0.74, EUR: 1.08 })
  lastUpdated: string;
}

export const DEFAULT_PRICES: PriceData = {
  goldPerGram: 88,
  silverPerGram: 1.05,
  exchangeRates: { USD: 1 },
  lastUpdated: '',
};
