// ─── US & Canadian Tax Data for Retirement Penalty Engine ──────

// US Federal Marginal Tax Brackets (2026 approximate)
export const US_FEDERAL_BRACKETS: { min: number; max: number; rate: number }[] = [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
];

// US State Income Tax Rates (simplified — effective/flat rate for most common scenarios)
export const US_STATES: { code: string; name: string; rate: number }[] = [
    { code: 'AL', name: 'Alabama', rate: 0.05 },
    { code: 'AK', name: 'Alaska', rate: 0 },
    { code: 'AZ', name: 'Arizona', rate: 0.025 },
    { code: 'AR', name: 'Arkansas', rate: 0.044 },
    { code: 'CA', name: 'California', rate: 0.093 },
    { code: 'CO', name: 'Colorado', rate: 0.044 },
    { code: 'CT', name: 'Connecticut', rate: 0.05 },
    { code: 'DE', name: 'Delaware', rate: 0.055 },
    { code: 'FL', name: 'Florida', rate: 0 },
    { code: 'GA', name: 'Georgia', rate: 0.0549 },
    { code: 'HI', name: 'Hawaii', rate: 0.07 },
    { code: 'ID', name: 'Idaho', rate: 0.058 },
    { code: 'IL', name: 'Illinois', rate: 0.0495 },
    { code: 'IN', name: 'Indiana', rate: 0.0305 },
    { code: 'IA', name: 'Iowa', rate: 0.06 },
    { code: 'KS', name: 'Kansas', rate: 0.057 },
    { code: 'KY', name: 'Kentucky', rate: 0.04 },
    { code: 'LA', name: 'Louisiana', rate: 0.0425 },
    { code: 'ME', name: 'Maine', rate: 0.0715 },
    { code: 'MD', name: 'Maryland', rate: 0.0575 },
    { code: 'MA', name: 'Massachusetts', rate: 0.05 },
    { code: 'MI', name: 'Michigan', rate: 0.0425 },
    { code: 'MN', name: 'Minnesota', rate: 0.0785 },
    { code: 'MS', name: 'Mississippi', rate: 0.05 },
    { code: 'MO', name: 'Missouri', rate: 0.048 },
    { code: 'MT', name: 'Montana', rate: 0.0575 },
    { code: 'NE', name: 'Nebraska', rate: 0.0564 },
    { code: 'NV', name: 'Nevada', rate: 0 },
    { code: 'NH', name: 'New Hampshire', rate: 0 },
    { code: 'NJ', name: 'New Jersey', rate: 0.0637 },
    { code: 'NM', name: 'New Mexico', rate: 0.059 },
    { code: 'NY', name: 'New York', rate: 0.0685 },
    { code: 'NC', name: 'North Carolina', rate: 0.0475 },
    { code: 'ND', name: 'North Dakota', rate: 0.029 },
    { code: 'OH', name: 'Ohio', rate: 0.0399 },
    { code: 'OK', name: 'Oklahoma', rate: 0.0475 },
    { code: 'OR', name: 'Oregon', rate: 0.099 },
    { code: 'PA', name: 'Pennsylvania', rate: 0.0307 },
    { code: 'RI', name: 'Rhode Island', rate: 0.0599 },
    { code: 'SC', name: 'South Carolina', rate: 0.065 },
    { code: 'SD', name: 'South Dakota', rate: 0 },
    { code: 'TN', name: 'Tennessee', rate: 0 },
    { code: 'TX', name: 'Texas', rate: 0 },
    { code: 'UT', name: 'Utah', rate: 0.0465 },
    { code: 'VT', name: 'Vermont', rate: 0.066 },
    { code: 'VA', name: 'Virginia', rate: 0.0575 },
    { code: 'WA', name: 'Washington', rate: 0 },
    { code: 'WV', name: 'West Virginia', rate: 0.055 },
    { code: 'WI', name: 'Wisconsin', rate: 0.0653 },
    { code: 'WY', name: 'Wyoming', rate: 0 },
    { code: 'DC', name: 'Washington D.C.', rate: 0.085 },
];

// Canadian Province Tax Data
export const CA_PROVINCES: { code: string; name: string; rate: number }[] = [
    { code: 'ON', name: 'Ontario', rate: 0.0916 },
    { code: 'BC', name: 'British Columbia', rate: 0.0770 },
    { code: 'AB', name: 'Alberta', rate: 0.10 },
    { code: 'QC', name: 'Quebec', rate: 0.1475 },
    { code: 'SK', name: 'Saskatchewan', rate: 0.105 },
    { code: 'MB', name: 'Manitoba', rate: 0.108 },
    { code: 'NB', name: 'New Brunswick', rate: 0.095 },
    { code: 'NS', name: 'Nova Scotia', rate: 0.105 },
    { code: 'PE', name: 'Prince Edward Island', rate: 0.098 },
    { code: 'NL', name: 'Newfoundland & Labrador', rate: 0.087 },
];

export const ALL_STATES_PROVINCES = [
    ...US_STATES.map((s) => ({ ...s, country: 'US' as const })),
    ...CA_PROVINCES.map((s) => ({ ...s, country: 'CA' as const })),
];

// Early withdrawal penalties
export const EARLY_WITHDRAWAL_PENALTY = {
    US_401K: 0.10,      // 10% IRS penalty
    US_IRA: 0.10,       // 10% IRS penalty
    CA_RRSP: 0.10,      // Withholding tax on first $5,000 (simplified)
    CA_RRSP_MID: 0.20,  // $5,001 - $15,000
    CA_RRSP_HIGH: 0.30, // $15,001+
};

// Calculate the US federal marginal tax rate for a given income
export function getUSFederalMarginalRate(income: number): number {
    for (let i = US_FEDERAL_BRACKETS.length - 1; i >= 0; i--) {
        if (income >= US_FEDERAL_BRACKETS[i].min) {
            return US_FEDERAL_BRACKETS[i].rate;
        }
    }
    return 0.10;
}

// Get the combined tax rate (federal + state/province)
export function getCombinedTaxRate(income: number, stateCode?: string): number {
    const federalRate = getUSFederalMarginalRate(income);

    if (!stateCode) return federalRate;

    const state = ALL_STATES_PROVINCES.find((s) => s.code === stateCode);
    if (!state) return federalRate;

    // For Canadian provinces, use a different federal rate structure
    if (state.country === 'CA') {
        // Canadian federal rates (simplified)
        let caFederalRate = 0.15;
        if (income > 55867) caFederalRate = 0.205;
        if (income > 111733) caFederalRate = 0.26;
        if (income > 154906) caFederalRate = 0.29;
        if (income > 220000) caFederalRate = 0.33;
        return caFederalRate + state.rate;
    }

    return federalRate + state.rate;
}

// Calculate net accessible value after tax + penalty for retirement accounts
export function calculateRetirementNetAccessible(
    grossValue: number,
    income: number,
    stateCode: string | undefined,
    isUnderRetirementAge: boolean,
    accountType: string
): { penalty: number; taxRate: number; netAccessible: number } {
    const isCanadian = accountType === 'Taxable_RRSP';
    const isNonTaxable = accountType?.startsWith('NonTaxable');

    if (isNonTaxable) {
        return { penalty: 0, taxRate: 0, netAccessible: grossValue };
    }

    const taxRate = getCombinedTaxRate(income, stateCode);

    let penaltyRate = 0;
    if (isUnderRetirementAge) {
        if (isCanadian) {
            // Canadian RRSP withholding
            if (grossValue > 15000) penaltyRate = EARLY_WITHDRAWAL_PENALTY.CA_RRSP_HIGH;
            else if (grossValue > 5000) penaltyRate = EARLY_WITHDRAWAL_PENALTY.CA_RRSP_MID;
            else penaltyRate = EARLY_WITHDRAWAL_PENALTY.CA_RRSP;
        } else {
            penaltyRate = EARLY_WITHDRAWAL_PENALTY.US_401K;
        }
    }

    const netAccessible = grossValue * (1 - penaltyRate - taxRate);

    return {
        penalty: penaltyRate,
        taxRate,
        netAccessible: Math.max(0, netAccessible),
    };
}
