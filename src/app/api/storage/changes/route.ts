import { withStorage } from '@/lib/storage/server';
import { parseChanges } from '@/lib/storage/validate';
import { StorageError } from '@/lib/storage/types';

/** Save a batch of changes (and refresh the Summary tab) in one round trip. */
export const POST = withStorage(async (provider, req) => {
    const parsed = parseChanges(await req.json().catch(() => null));
    if (!parsed) throw new StorageError('INVALID', 'Malformed change batch');
    await provider.applyChanges(parsed.fileId, parsed.ops, parsed.summary);
    return { saved: parsed.ops.length };
});
