// ─── Plans and features ───────────────────────────────────
//
// ZakatFlow's rule (Ayman, Nov 12 2026): everything needed to calculate
// Zakat correctly is free, forever. Pro only adds convenience on top.
// See docs/pro-plan.md for the reasoning behind each line below.
//
// This file is the single place that decides what is free and what is Pro.
// Nothing is gated yet: getPlan() always returns 'free' unless the dev
// preview flag is set, and every 'core' feature is free by construction.

export type Plan = 'free' | 'pro';

/** core = needed for a correct Zakat number; convenience = saves time only. */
export type FeatureKind = 'core' | 'convenience';

export interface FeatureDef {
  kind: FeatureKind;
  /** Lowest plan that includes it. A core feature can only ever be 'free'. */
  plan: Plan;
  label: string;
  /** Has a running cost per user (aggregator fees, email, storage). */
  hasRunningCost?: boolean;
}

export const FEATURES = {
  // ── Core: always free ──
  allAssetClasses:        { kind: 'core', plan: 'free', label: 'Every asset and liability type, all madhab settings' },
  nisabLivePrices:        { kind: 'core', plan: 'free', label: 'Gold and silver Nisab with live prices' },
  filingsStockZakat:      { kind: 'core', plan: 'free', label: 'Exact stock Zakat from company filings' },
  fundLookThrough:        { kind: 'core', plan: 'free', label: 'ETF, mutual fund and 401(k) look-through' },
  retirementTaxAware:     { kind: 'core', plan: 'free', label: 'Tax- and penalty-aware retirement accounts (US, CA, UK)' },
  methodChoice:           { kind: 'core', plan: 'free', label: "Choose your scholar's method, with the ruling cited on each line" },
  hawlCountdown:          { kind: 'core', plan: 'free', label: 'Hawl countdown and calendar (.ics) download' },
  zakatPaidTracking:      { kind: 'core', plan: 'free', label: 'Record Zakat paid against Zakat due' },
  csvImport:              { kind: 'core', plan: 'free', label: 'Import holdings from a CSV export, in your browser' },
  historyInOwnSheet:      { kind: 'core', plan: 'free', label: 'Every year kept in your own Google Sheet' },
  exportOwnData:          { kind: 'core', plan: 'free', label: 'Export all your data' },

  // ── Convenience: Pro ──
  linkedBrokerages:       { kind: 'convenience', plan: 'pro', label: 'Link brokerages to pull holdings automatically', hasRunningCost: true },
  emailHawlReminders:     { kind: 'convenience', plan: 'pro', label: 'Emailed Hawl reminders (opt-in)', hasRunningCost: true },
  household:              { kind: 'convenience', plan: 'pro', label: 'Separate Zakat for spouse and children in one place' },
  pdfStatement:           { kind: 'convenience', plan: 'pro', label: 'Polished PDF Zakat statement with filing evidence' },
  donationReceipts:       { kind: 'convenience', plan: 'pro', label: 'Donation ledger with receipts and recipient categories' },
  yearOverYear:           { kind: 'convenience', plan: 'pro', label: 'Year-over-year Zakat comparison' },
} as const satisfies Record<string, FeatureDef>;

export type Feature = keyof typeof FEATURES;

// Guard: a core feature can never be set to Pro by mistake.
for (const [key, def] of Object.entries(FEATURES) as [Feature, FeatureDef][]) {
  if (def.kind === 'core' && def.plan !== 'free') {
    throw new Error(`Core feature "${key}" must stay free (see docs/pro-plan.md).`);
  }
}

const RANK: Record<Plan, number> = { free: 0, pro: 1 };

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return RANK[plan] >= RANK[FEATURES[feature].plan];
}

/**
 * The user's plan. Today everyone is on 'free'.
 *
 * When billing exists, the plan must come from the server (a signed
 * entitlement), never from the user's own Google Sheet, which they can edit.
 * NEXT_PUBLIC_PRO_PREVIEW=1 turns Pro on locally for development only.
 */
export function getPlan(): Plan {
  if (process.env.NEXT_PUBLIC_PRO_PREVIEW === '1') return 'pro';
  return 'free';
}
