import type { ChangeOp, SummaryPayload } from './types';

const KEYED = new Set(['assets', 'liabilities', 'donations', 'history']);
const MAX_OPS = 500;

const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validate the shape of a change batch from the browser. Field values are
 * coerced by column type when written, so only structure is checked here. */
export function parseChanges(body: unknown): { fileId: string; ops: ChangeOp[]; summary?: SummaryPayload } | null {
    if (!isObject(body)) return null;
    const { fileId, ops, summary } = body;
    if (typeof fileId !== 'string' || !/^[\w-]{10,200}$/.test(fileId)) return null;
    if (!Array.isArray(ops) || ops.length > MAX_OPS) return null;

    for (const op of ops) {
        if (!isObject(op)) return null;
        if (op.action === 'delete') {
            if (!KEYED.has(op.entity as string) || typeof op.key !== 'string' || !op.key) return null;
        } else if (op.action === 'upsert') {
            if (!(KEYED.has(op.entity as string) || op.entity === 'settings') || !isObject(op.record)) return null;
            const key = op.entity === 'history' ? op.record.year : op.record.id;
            if (op.entity !== 'settings' && (typeof key !== 'string' || !key)) return null;
        } else {
            return null;
        }
    }

    let parsedSummary: SummaryPayload | undefined;
    if (summary !== undefined) {
        if (!isObject(summary) || typeof summary.baseCurrency !== 'string' || !Array.isArray(summary.years)) return null;
        parsedSummary = {
            baseCurrency: summary.baseCurrency.slice(0, 8),
            years: summary.years.slice(0, 100).filter(isObject).map((y) => ({
                year: String(y.year ?? '').slice(0, 10),
                totalAssets: Number(y.totalAssets) || 0,
                notZakatable: Number(y.notZakatable) || 0,
                debtsDeducted: Number(y.debtsDeducted) || 0,
                netZakatable: Number(y.netZakatable) || 0,
                nisab: Number(y.nisab) || 0,
                aboveNisab: Boolean(y.aboveNisab),
                zakatDue: Number(y.zakatDue) || 0,
            })),
        };
    }

    return { fileId, ops: ops as ChangeOp[], summary: parsedSummary };
}
