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
export type ZakatMethod = 'Market' | 'Passive_Proxy' | 'Manual' | 'Commodity_ETF' | 'Filings';
// Which filings-based formula produced zakatableAssetPercent (see lib/stock-zakat)
export type FilingsMethod = 'Asset_Ratio' | 'Per_Share';
export type WeightUnit = 'grams' | 'troy_oz' | 'tola';

export type RetirementAccountType =
  | 'Taxable_401k'
  | 'Taxable_RRSP'
  | 'NonTaxable_Roth'
  | 'NonTaxable_TFSA'
  | 'NonTaxable_Brokerage';

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
  anniversaryHijri?: string; // "M-D" e.g. "9-1" for 1st Ramadan
  incomeLevel?: number; // annual income for marginal tax estimation
  stateProvince?: string; // US state or Canadian province code
  isUnderRetirementAge?: boolean; // for early withdrawal penalty
}

export const DEFAULT_SETTINGS: Settings = {
  madhab: 'Hanafi',
  nisabStandard: 'Gold',
  calculationBasis: 'Hijri',
  baseCurrency: 'USD',
  isUnderRetirementAge: true,
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

  // Filings-based (zakatMethod === 'Filings'): evidence for the percentage above
  filingsMethod?: FilingsMethod;
  filingPeriodEnd?: string;   // balance-sheet date used, YYYY-MM-DD
  filingAccession?: string;   // SEC accession number of the filing

  // Retirement-specific
  retirementType?: RetirementType;
  retirementAccountType?: RetirementAccountType;

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

  // Interest: the account pays interest that must be given away (see InterestEntry)
  earnsInterest?: boolean;

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

// ─── Donation Entry ──────────────────────────────────────

/**
 * One allocation of money to one recipient. A payment split across several
 * charities is several entries sharing a `paymentId`; an instalment of a
 * payment plan also carries the plan's `planId`.
 *
 * 'Interest' = interest given away (purification). It is not Zakat and not
 * Sadaqah: it never counts toward Zakat due and carries no expectation of reward.
 */
export type DonationCategory = 'Zakat' | 'Sadaqah' | 'Interest' | 'Other';

export interface DonationEntry {
  id: string; // Unique identifier for the donation
  zakatYear?: string; // e.g. "2025" — which Zakat year this payment counts toward
  date: string;
  amount: number;
  recipient: string;
  notes: string;
  category: DonationCategory;
  /** Groups the allocations of one payment (several recipients, one payment). */
  paymentId?: string;
  /** Set when the payment is an instalment of a donation plan. */
  planId?: string;
}

// ─── Donation plans (pay once or in instalments) ─────────

export type PlanFrequency = 'once' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly';

export interface DonationPlan {
  id: string;
  zakatYear: string;           // the Zakat year this plan pays toward
  category: Exclude<DonationCategory, 'Other'>;
  totalAmount: number;         // in base currency
  frequency: PlanFrequency;
  startDate: string;           // YYYY-MM-DD, first instalment
  numberOfPayments: number;    // 1 for 'once'
  status: 'active' | 'completed' | 'cancelled';
  notes: string;
}

// ─── Interest earned (to be given away in full) ──────────

export interface InterestEntry {
  id: string;
  zakatYear: string;           // Zakat year the interest was earned in
  date: string;                // statement date / end of the period
  assetId?: string;            // account it was earned on, if recorded on an asset
  accountName: string;
  currency: string;
  amount: number;              // in `currency`
  period: 'month' | 'year' | 'other';
  notes: string;
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
  recipientsList: string; // JSON string of DonationEntry[]
  donations?: DonationEntry[];
}

// ─── Dashboard Summary ───────────────────────────────────

export interface DashboardSummary {
  totalGrossAssets: number;
  totalDeductions: number;
  totalNetZakatableAssets: number;
  totalLiabilities: number;
  liabilityDeduction: number;
  /** Interest held but not yet given away: not the owner's wealth, so not Zakatable. */
  interestToGiveAway: number;
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
