import { NextResponse, type NextRequest } from 'next/server';
import { getGoogleAccessToken } from '../server-auth';
import { GoogleSheetsProvider } from './google/provider';
import { type StorageProvider, StorageError } from './types';

type Handler = (provider: StorageProvider, req: NextRequest) => Promise<unknown>;

const STATUS: Record<StorageError['code'], number> = {
    REAUTH: 401,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    INVALID: 400,
    UNKNOWN: 502,
};

/**
 * Wrap a storage API route: resolve the signed-in user's provider and turn
 * failures into `{ error, code }` responses the client knows how to handle.
 */
export function withStorage(handler: Handler) {
    return async (req: NextRequest) => {
        const auth = await getGoogleAccessToken(req);
        if (!auth.ok) {
            return NextResponse.json({ error: 'Please sign in again', code: auth.code }, { status: auth.status });
        }

        try {
            const provider = new GoogleSheetsProvider(auth.accessToken);
            const data = await handler(provider, req);
            return NextResponse.json({ data });
        } catch (error) {
            if (error instanceof StorageError) {
                console.error(`Storage error (${error.code}):`, error.message);
                return NextResponse.json(
                    { error: publicMessage(error.code), code: error.code },
                    { status: STATUS[error.code] }
                );
            }
            console.error('Storage error:', error);
            return NextResponse.json({ error: publicMessage('UNKNOWN'), code: 'UNKNOWN' }, { status: 500 });
        }
    };
}

function publicMessage(code: StorageError['code']): string {
    switch (code) {
        case 'REAUTH':
            return 'Your Google connection has expired. Please reconnect.';
        case 'NOT_FOUND':
            return "We couldn't find your spreadsheet. Reload to reconnect it.";
        case 'RATE_LIMITED':
            return 'Google is busy right now. Please try again in a moment.';
        case 'INVALID':
            return 'Your spreadsheet rejected the change. Try "Repair my sheet" in Settings.';
        default:
            return 'Something went wrong saving to your spreadsheet. Please try again.';
    }
}
