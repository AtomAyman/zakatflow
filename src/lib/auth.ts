import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope:
                        'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // On initial sign-in, persist the access & refresh tokens
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.accessTokenExpires = account.expires_at
                    ? account.expires_at * 1000
                    : Date.now() + 3600 * 1000;
            }

            // If token hasn't expired, return it
            if (Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            // Token expired → refresh it
            return await refreshAccessToken(token);
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.error = token.error as string | undefined;
            return session;
        },
    },
    pages: {
        signIn: '/',
    },
    session: {
        strategy: 'jwt',
    },
};

async function refreshAccessToken(token: Record<string, unknown>) {
    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken as string,
            }),
        });

        const refreshed = await response.json();

        if (!response.ok) throw refreshed;

        return {
            ...token,
            accessToken: refreshed.access_token,
            accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
        };
    } catch {
        return {
            ...token,
            error: 'RefreshAccessTokenError',
        };
    }
}

// Extend NextAuth types
declare module 'next-auth' {
    interface Session {
        accessToken: string;
        error?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
        error?: string;
    }
}
