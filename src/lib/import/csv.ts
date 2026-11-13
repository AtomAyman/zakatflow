// ─── Brokerage CSV holdings import (free, browser-only) ───
//
// Thin wrapper over parse.ts for the holdings case, kept as a
// FileHoldingsSource so it sits in the same registry as future linked sources.

import { parseImportFile } from './parse';
import { parseDelimited } from './table';
import type { FileHoldingsSource, ImportResult } from './types';

/** Kept for callers that only need rows (comma-delimited). */
export function parseCsvRows(text: string): string[][] {
  return parseDelimited(text, ',');
}

export function parseHoldingsCsv(text: string): ImportResult {
  const parsed = parseImportFile(text, 'holdings');
  if ('error' in parsed) return { holdings: [], skipped: [], warnings: [parsed.error] };
  return { holdings: parsed.holdings, skipped: parsed.skipped, warnings: parsed.warnings };
}

export const genericCsvSource: FileHoldingsSource = {
  id: 'csv-generic',
  label: 'Brokerage CSV export',
  kind: 'file',
  regions: ['US', 'CA', 'UK'],
  feature: 'csvImport',
  dataLeavesBrowser: false,
  accept: '.csv,.tsv,.txt,text/csv',
  parse: parseHoldingsCsv,
};
