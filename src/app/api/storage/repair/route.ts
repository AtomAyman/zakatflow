import { withStorage } from '@/lib/storage/server';
import { StorageError } from '@/lib/storage/types';

/** Restore missing tabs/columns, formatting and protection. Never deletes data. */
export const POST = withStorage(async (provider, req) => {
    const body = await req.json().catch(() => null);
    const fileId = body?.fileId;
    if (typeof fileId !== 'string' || !/^[\w-]{10,200}$/.test(fileId)) {
        throw new StorageError('INVALID', 'Missing file ID');
    }
    return provider.repair(fileId);
});
