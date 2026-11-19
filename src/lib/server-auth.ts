import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { refreshAccessToken } from './auth';

export type GoogleAuth =
    | { ok: true; accessToken: string; email?: string | null }
    | { ok: false; status: 401; code: 'UNAUTHENTICATED' | 'REAUTH' };

/**
 * Read the signed-in user's Google access token from the encrypted session
 * cookie. The token is never sent to the browser. If it has expired it is
 * refreshed for this request (the session cookie itself is refreshed the
 * next time the browser polls /api/auth/session).
 */
export async function getGoogleAccessToken(req: NextRequest): Promise<GoogleAuth> {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return { ok: false, status: 401, code: 'UNAUTHENTICATED' };
    if (token.error || !token.accessToken) return { ok: false, status: 401, code: 'REAUTH' };

    const expiresAt = token.accessTokenExpires ?? 0;
    // Refresh a minute early to avoid using a token that expires mid-request.
    if (Date.now() < expiresAt - 60_000) {
        return { ok: true, accessToken: token.accessToken, email: token.email };
    }

    if (!token.refreshToken) return { ok: false, status: 401, code: 'REAUTH' };
    const refreshed = await refreshAccessToken(token as Record<string, unknown>);
    if ('error' in refreshed || !refreshed.accessToken) {
        return { ok: false, status: 401, code: 'REAUTH' };
    }
    return { ok: true, accessToken: refreshed.accessToken as string, email: token.email };
}
