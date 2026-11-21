// Registry of holdings sources and the public import API.
// Linked (aggregator or own-key broker) sources are added here only once
// chosen; see docs/pro-plan.md.

import { hasFeature, type Plan } from '../plan';
import { genericCsvSource } from './csv';
import type { HoldingsSource, Region } from './types';

export * from './types';
export { parseHoldingsCsv, parseCsvRows } from './csv';
export { parseImportFile, detectKind, balancesAsOf, normalizeDate } from './parse';
export type { ImportKind, ImportedBalance, ImportedZakatYear, ParsedFile } from './parse';
export { parseStatementText } from './statement-text';
export { classifyName } from './classify';
export * from './draft';

export const HOLDINGS_SOURCES: HoldingsSource[] = [genericCsvSource];

/** Sources the user can pick, for their plan and region. */
export function availableSources(plan: Plan, region: Region): HoldingsSource[] {
  return HOLDINGS_SOURCES.filter((s) => s.regions.includes(region) && hasFeature(plan, s.feature));
}
