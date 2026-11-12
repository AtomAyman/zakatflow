// Registry of holdings sources. Linked (aggregator) sources are added here
// only once a provider is chosen and approved; see docs/pro-plan.md.

import { hasFeature, type Plan } from '../plan';
import { genericCsvSource } from './csv';
import type { HoldingsSource, Region } from './types';

export * from './types';
export { parseHoldingsCsv, parseCsvRows } from './csv';

export const HOLDINGS_SOURCES: HoldingsSource[] = [genericCsvSource];

/** Sources the user can pick, for their plan and region. */
export function availableSources(plan: Plan, region: Region): HoldingsSource[] {
  return HOLDINGS_SOURCES.filter((s) => s.regions.includes(region) && hasFeature(plan, s.feature));
}
