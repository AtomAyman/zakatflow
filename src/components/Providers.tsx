'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { type ReactNode } from 'react';

// Re-check the session regularly so the Google token is refreshed in the
// session cookie and an expired connection is noticed promptly.
const SESSION_REFRESH_SECONDS = 20 * 60;

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider refetchInterval={SESSION_REFRESH_SECONDS} refetchOnWindowFocus>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
}
