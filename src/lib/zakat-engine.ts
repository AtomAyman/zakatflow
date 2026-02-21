import {
    type Settings,
    type Asset,
    type Liability,
    type DashboardSummary,
    type PriceData,
    type AssetType,
    type CalcBasis,
    type Madhab,
    type NisabStandard,
} from './types';
import { convertToBaseCurrency } from './price-service';

// ─── Constants ────────────────────────────────────────────

const NISAB_GOLD_GRAMS = 87.48;
const NISAB_SILVER_GRAMS = 612.36;

const ASSET_COLORS: Record<AssetType, string> = {
    Cash: '#10b981',
    Bank: '#3b82f6',
    Stock: '#8b5cf6',
    Crypto: '#f59e0b',
    Retirement: '#ef4444',
    Gold: '#eab308',
    Silver: '#94a3b8',
    Merchandise: '#ec4899',
    Debt_Receivable: '#06b6d4',
};

// ─── Zakat Rate ───────────────────────────────────────────

export function getZakatRate(calcBasis: CalcBasis): number {
    return calcBasis === 'Hijri' ? 0.025 : 0.02577;
}

// ─── Nisab Threshold ──────────────────────────────────────
// Returns nisab in base currency

export function calculateNisab(
    nisabStandard: NisabStandard,
    prices: PriceData,
    baseCurrency: string
): number {
    // Gold/silver prices are in USD — convert to base currency
    const usdToBase = 1 / (prices.exchangeRates[baseCurrency] ?? 1);

    if (nisabStandard === 'Gold') {
        return NISAB_GOLD_GRAMS * prices.goldPerGram * usdToBase;
    }
    return NISAB_SILVER_GRAMS * prices.silverPerGram * usdToBase;
}

// ─── Liability Deduction (Fiqh-Based) ─────────────────────
// Per the Guide:
// Hanafi: Deduct one year worth of the following from assets:
//   - Outstanding utility/medical bills
//   - One year of mortgage/rent
//   - Credit balances (goods received, not paid)
//   - Outstanding salaries/service fees
//   - Dowry (if intending to pay this year)
//   - Personal loans due within a year
//   - One year of commercial loan payments

export function calculateLiabilityDeduction(
    liabilities: Liability[],
    madhab: Madhab,
    baseCurrency: string,
    exchangeRates: Record<string, number>
): number {
    if (madhab === 'Hanafi') {
        // Hanafi: deduct 12 months of payments for long-term debts,
        // or total amount for short-term/immediate debts
        return liabilities.reduce((sum, l) => {
            const converted = convertToBaseCurrency(
                l.isImmediate ? l.totalAmount : l.monthlyPayment * 12,
                l.currency,
                baseCurrency,
                exchangeRates
            );
            return sum + converted;
        }, 0);
    }

    // Shafi/Maliki/Hanbali: only immediate debts
    return liabilities.reduce((sum, l) => {
        if (l.isImmediate) {
            return sum + convertToBaseCurrency(l.totalAmount, l.currency, baseCurrency, exchangeRates);
        }
        return sum;
    }, 0);
}

// ─── Per-Asset Net Zakatable Value ────────────────────────
// Returns values ALREADY converted to base currency

export function calculateAssetNetValue(
    asset: Asset,
    settings: Settings,
    exchangeRates: Record<string, number>,
    prices?: PriceData
): { deductible: number; netZakatable: number; computedGrossInBase: number } {
    // ── Gold/Silver with weight → auto-calculate value from live price ──
    let grossInBase: number;

    if ((asset.type === 'Gold' || asset.type === 'Silver') && !asset.isETF && asset.weightGrams && prices) {
        // Calculate value from weight × live price
        const pricePerGram = asset.type === 'Gold' ? prices.goldPerGram : prices.silverPerGram;
        const purityMultiplier = asset.goldPurity ? asset.goldPurity / 24 : 1; // e.g. 18K = 0.75
        const valueInUSD = asset.weightGrams * pricePerGram * purityMultiplier;
        // Convert USD to base currency
        const usdToBase = 1 / (exchangeRates[settings.baseCurrency] ?? 1);
        grossInBase = valueInUSD * usdToBase;
    } else {
        // Convert gross value to base currency
        grossInBase = convertToBaseCurrency(
            asset.grossValue,
            asset.currency,
            settings.baseCurrency,
            exchangeRates
        );
    }

    // ── Retirement accounts (per Guide) ──
    if (asset.type === 'Retirement') {
        if (asset.retirementType === 'Mandatory') {
            // Mandatory retirement (pension, cash balance): NOT zakatable until received
            return { deductible: grossInBase, netZakatable: 0, computedGrossInBase: grossInBase };
        }
        // Voluntary (401k, IRA): treated as long-term stock investment
        // Apply zakatable assets % if provided, else default to 40%
        const zakatablePercent = asset.zakatableAssetPercent ?? 40;
        const netZakatable = grossInBase * (zakatablePercent / 100);
        return { deductible: grossInBase - netZakatable, netZakatable, computedGrossInBase: grossInBase };
    }

    // ── Stocks (per Guide) ──
    if (asset.type === 'Stock') {
        if (asset.stockHoldingType === 'Long_Term') {
            // Long-term: only zakatable portion of company assets
            const zakatablePercent = asset.zakatableAssetPercent ?? 40;
            const netZakatable = grossInBase * (zakatablePercent / 100);
            return { deductible: grossInBase - netZakatable, netZakatable, computedGrossInBase: grossInBase };
        }
        // Short-term: 100% market value
        return { deductible: 0, netZakatable: grossInBase, computedGrossInBase: grossInBase };
    }

    // ── Crypto (per Guide) ──
    if (asset.type === 'Crypto') {
        if (asset.cryptoIntent === 'Platform_Token') {
            // Platform tokens used within platform: NOT zakatable
            return { deductible: grossInBase, netZakatable: 0, computedGrossInBase: grossInBase };
        }
        // Currency (Bitcoin etc.) or Resale intent → 100% zakatable
        return { deductible: 0, netZakatable: grossInBase, computedGrossInBase: grossInBase };
    }

    // ── Debt Receivable (per Guide) ──
    if (asset.type === 'Debt_Receivable') {
        if (asset.debtStrength === 'Strong') {
            // Strong debt: zakatable regardless of possession
            return { deductible: 0, netZakatable: grossInBase, computedGrossInBase: grossInBase };
        }
        // Weak or Intermediate: not zakatable until received
        return { deductible: grossInBase, netZakatable: 0, computedGrossInBase: grossInBase };
    }

    // ── Gold/Silver Jewelry exemption ──
    if ((asset.type === 'Gold' || asset.type === 'Silver') && asset.isJewelry) {
        if (settings.madhab !== 'Hanafi') {
            // Non-Hanafi: worn jewelry is exempt
            return { deductible: grossInBase, netZakatable: 0, computedGrossInBase: grossInBase };
        }
        // Hanafi: jewelry IS zakatable
    }

    // ── Default: apply valuation percent ──
    const valuationMultiplier = asset.valuationPercent / 100;
    const netZakatable = grossInBase * valuationMultiplier;

    return { deductible: grossInBase - netZakatable, netZakatable: Math.max(0, netZakatable), computedGrossInBase: grossInBase };
}

// ─── Full Dashboard Calculation Pipeline ──────────────────

export function calculateDashboard(
    assets: Asset[],
    liabilities: Liability[],
    settings: Settings,
    prices: PriceData
): DashboardSummary {
    const zakatRate = getZakatRate(settings.calculationBasis);
    const nisabThreshold = calculateNisab(settings.nisabStandard, prices, settings.baseCurrency);

    // Calculate each asset's net value (converted to base currency)
    let totalGrossAssets = 0;
    let totalDeductions = 0;
    let totalNetZakatableAssets = 0;

    const assetBreakdownMap: Record<AssetType, number> = {
        Cash: 0, Bank: 0, Stock: 0, Crypto: 0, Retirement: 0,
        Gold: 0, Silver: 0, Merchandise: 0, Debt_Receivable: 0,
    };

    for (const asset of assets) {
        const { deductible, netZakatable, computedGrossInBase } = calculateAssetNetValue(
            asset, settings, prices.exchangeRates, prices
        );

        totalGrossAssets += computedGrossInBase;
        totalDeductions += deductible;
        totalNetZakatableAssets += netZakatable;
        assetBreakdownMap[asset.type] += netZakatable;
    }

    // Liability deduction (converted to base currency)
    const totalLiabilities = liabilities.reduce((s, l) =>
        s + convertToBaseCurrency(l.totalAmount, l.currency, settings.baseCurrency, prices.exchangeRates), 0
    );
    const liabilityDeduction = calculateLiabilityDeduction(
        liabilities, settings.madhab, settings.baseCurrency, prices.exchangeRates
    );

    // Net zakatable wealth
    const netZakatableWealth = Math.max(0, totalNetZakatableAssets - liabilityDeduction);
    const isAboveNisab = netZakatableWealth >= nisabThreshold;
    const zakatDue = isAboveNisab ? netZakatableWealth * zakatRate : 0;

    // Asset breakdown for charts
    const assetBreakdown = Object.entries(assetBreakdownMap)
        .filter(([, value]) => value > 0)
        .map(([type, value]) => ({
            type: type as AssetType,
            value,
            color: ASSET_COLORS[type as AssetType],
        }));

    return {
        totalGrossAssets,
        totalDeductions,
        totalNetZakatableAssets,
        totalLiabilities,
        liabilityDeduction,
        netZakatableWealth,
        nisabThreshold,
        isAboveNisab,
        zakatRate,
        zakatDue,
        assetBreakdown,
    };
}

