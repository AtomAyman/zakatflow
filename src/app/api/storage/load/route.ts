import { withStorage } from '@/lib/storage/server';

/** Find or create the user's spreadsheet, upgrade it if needed, and return all data. */
export const POST = withStorage((provider) => provider.load());
