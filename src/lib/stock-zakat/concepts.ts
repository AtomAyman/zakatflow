// ─── XBRL concept mappings ─────────────────────────────────────────────────
//
// Companies tag the same balance-sheet line with different concepts, and a
// single company can switch concepts between years (e.g. P&G moved from
// CashAndCashEquivalentsAtCarryingValue to the restricted-cash total).
// Each field is therefore a list of strategies, tried in order *at the chosen
// balance-sheet date*. A strategy matches when its `primary` concept has a
// value at that date; any `extras` present at the same date are added to it.
// Extras must be separate balance-sheet lines, never subtotals of the primary.

import type { ComponentKey, Taxonomy } from './types';

export interface ConceptStrategy {
    primary: string;
    extras?: string[];
    /** Warning shown to the user when this strategy is the one used. */
    note?: string;
}

export type FieldKey = ComponentKey | 'totalAssets' | 'currentAssets' | 'currentLiabilities' | 'sharesOutstanding';

export const CONCEPTS: Record<Taxonomy, Record<FieldKey, ConceptStrategy[]>> = {
    'us-gaap': {
        totalAssets: [{ primary: 'Assets' }],
        currentAssets: [{ primary: 'AssetsCurrent' }],
        currentLiabilities: [{ primary: 'LiabilitiesCurrent' }],
        cash: [
            { primary: 'CashAndCashEquivalentsAtCarryingValue' },
            {
                primary: 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
                note: 'Cash figure includes restricted cash (the company does not report unrestricted cash separately).',
            },
            { primary: 'Cash' },
        ],
        shortTermInvestments: [
            { primary: 'MarketableSecuritiesCurrent', extras: ['OtherShortTermInvestments'] },
            { primary: 'ShortTermInvestments' },
            { primary: 'AvailableForSaleSecuritiesDebtSecuritiesCurrent', extras: ['TradingSecuritiesCurrent'] },
            { primary: 'DebtSecuritiesCurrent' },
            // e.g. Coca-Cola: "Short-term investments" + unclassified "Marketable securities", both current.
            { primary: 'OtherShortTermInvestments', extras: ['MarketableSecurities'] },
        ],
        receivables: [
            // Totals first; never add a total's own parts to it. Loans made to
            // customers (e.g. Shopify merchant loans) are a separate line.
            { primary: 'ReceivablesNetCurrent', extras: ['NotesAndLoansReceivableNetCurrent'] },
            { primary: 'AccountsNotesAndLoansReceivableNetCurrent' },
            { primary: 'AccountsAndOtherReceivablesNetCurrent', extras: ['NotesAndLoansReceivableNetCurrent'] },
            {
                primary: 'AccountsReceivableNetCurrent',
                extras: ['NontradeReceivablesCurrent', 'OtherReceivablesNetCurrent', 'NotesAndLoansReceivableNetCurrent'],
            },
            { primary: 'AccountsReceivableGrossCurrent', note: 'Receivables reported gross (before bad-debt allowance).' },
        ],
        inventory: [
            { primary: 'InventoryNet' },
            { primary: 'EnergyRelatedInventory' },
            { primary: 'RetailRelatedInventoryMerchandise' },
            {
                primary: 'InventoryFinishedGoodsNetOfReserves',
                extras: ['InventoryWorkInProcessNetOfReserves', 'InventoryRawMaterialsNetOfReserves'],
                note: 'Inventory built up from finished goods, work in process and raw materials.',
            },
            { primary: 'InventoryGross', note: 'Inventory reported gross (before reserves).' },
        ],
        sharesOutstanding: [{ primary: 'CommonStockSharesOutstanding' }],
    },
    'ifrs-full': {
        totalAssets: [{ primary: 'Assets' }],
        currentAssets: [{ primary: 'CurrentAssets' }],
        currentLiabilities: [{ primary: 'CurrentLiabilities' }],
        cash: [{ primary: 'CashAndCashEquivalents' }, { primary: 'Cash' }],
        shortTermInvestments: [
            { primary: 'CurrentFinancialAssetsAtFairValueThroughProfitOrLoss', extras: ['CurrentFinancialAssetsAtAmortisedCost', 'CurrentFinancialAssetsAtFairValueThroughOtherComprehensiveIncome'] },
            { primary: 'CurrentFinancialAssetsAtAmortisedCost', extras: ['CurrentFinancialAssetsAtFairValueThroughOtherComprehensiveIncome'] },
            { primary: 'CurrentFinancialAssetsAtFairValueThroughOtherComprehensiveIncome' },
            { primary: 'ShorttermDepositsNotClassifiedAsCashEquivalents' },
        ],
        receivables: [
            { primary: 'TradeAndOtherCurrentReceivables' },
            { primary: 'CurrentTradeReceivables', extras: ['OtherCurrentReceivables'] },
        ],
        inventory: [{ primary: 'Inventories' }, { primary: 'CurrentInventoriesHeldForSale' }],
        sharesOutstanding: [{ primary: 'NumberOfSharesOutstanding' }],
    },
};

/** Periodic-report forms whose balance sheets we accept. */
export const ACCEPTED_FORMS = new Set([
    '10-K', '10-K/A', '10-Q', '10-Q/A', '10-KT', '10-KT/A',
    '20-F', '20-F/A', '40-F', '40-F/A',
]);

/** Forms filed by foreign private issuers (ADR ratios may apply). */
export const FOREIGN_FORMS = new Set(['20-F', '20-F/A', '40-F', '40-F/A']);
