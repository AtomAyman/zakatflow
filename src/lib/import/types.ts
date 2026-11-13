// ─── Holdings import: shared types ────────────────────────
//
// One interface for every way holdings get into ZakatFlow: a CSV the user
// exports from their brokerage (free, parsed in the browser) or, later, a
// linked account through an aggregator such as SnapTrade (Pro, server-side).
// See docs/pro-plan.md, "Account linking".
//
// Whatever the source, the output is the same list of ImportedHolding rows,
// which the user reviews before anything is written to their Sheet.

import type { Feature } from '../plan';
import type { RetirementAccountType } from '../types';

export type Region = 'US' | 'CA' | 'UK';

/** One position as the source reported it, before any Zakat logic. */
export interface ImportedHolding {
  symbol: string;              // ticker as the broker shows it, e.g. "VFV.TO", "AAPL"
  name?: string;
  quantity: number;
  currency?: string;           // ISO code if the source gives one
  marketValue?: number;        // in `currency`, if the source gives one
  accountName?: string;        // e.g. "RRSP - Questrade"
  exchange?: string;           // exchange code if given, e.g. "TSX", "XNAS"
  accountType?: RetirementAccountType | 'Cash_Account';
  asOf?: string;               // YYYY-MM-DD the source's values are for
}

export interface ImportResult {
  holdings: ImportedHolding[];
  /** Rows we could not read, with the reason, so the user can fix them. */
  skipped: { row: number; reason: string }[];
  warnings: string[];
}

interface SourceBase {
  id: string;                  // stable id, e.g. "csv-generic", "snaptrade"
  label: string;
  regions: Region[];
  /** Which plan feature this source needs (see lib/plan.ts). */
  feature: Feature;
  /**
   * Whether the user's holdings pass through a ZakatFlow server.
   * Shown to the user before they choose the source.
   */
  dataLeavesBrowser: boolean;
}

/** A file the user picks; parsed entirely in the browser. */
export interface FileHoldingsSource extends SourceBase {
  kind: 'file';
  dataLeavesBrowser: false;
  accept: string;              // e.g. ".csv,text/csv"
  parse(text: string): ImportResult;
}

/**
 * An account linked through an aggregator. The aggregator's secret and the
 * user's connection token live on the server; holdings are fetched on demand,
 * returned to the browser, written to the user's Sheet, and not stored by us.
 */
export interface LinkedHoldingsSource extends SourceBase {
  kind: 'linked';
  dataLeavesBrowser: true;
  /** Starts the aggregator's connect flow; resolves when the user finishes. */
  connect(): Promise<{ connectionId: string }>;
  fetchHoldings(connectionId: string): Promise<ImportResult>;
  /** Revokes the connection at the aggregator and deletes our token. */
  disconnect(connectionId: string): Promise<void>;
}

export type HoldingsSource = FileHoldingsSource | LinkedHoldingsSource;
