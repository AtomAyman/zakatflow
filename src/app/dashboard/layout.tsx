'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Logo from '@/components/Logo';
import SyncBanner from '@/components/SyncBanner';
import { useZakatStore } from '@/lib/store';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const loadStatus = useZakatStore((s) => s.loadStatus);
    const loadError = useZakatStore((s) => s.loadError);
    const syncStatus = useZakatStore((s) => s.syncStatus);
    const loadData = useZakatStore((s) => s.loadData);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    // Load the user's spreadsheet once per visit.
    useEffect(() => {
        if (status === 'authenticated' && loadStatus === 'idle') {
            loadData();
        }
    }, [status, loadStatus, loadData]);

    // A Google refresh failure is reported on the session itself.
    useEffect(() => {
        if (session?.error === 'RefreshAccessTokenError') {
            useZakatStore.setState({
                syncStatus: 'reauth',
                syncError: 'Your Google connection has expired. Please reconnect.',
            });
        }
    }, [session?.error]);

    // Warn before closing the tab while changes are still being saved.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            const { pendingChanges, syncStatus: s } = useZakatStore.getState();
            if (pendingChanges > 0 || s === 'saving') {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    if (status === 'loading' || loadStatus === 'idle' || loadStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-pulse flex justify-center mb-4">
                        <Logo size={56} />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                        {loadStatus === 'loading' ? 'Opening your spreadsheet…' : 'Loading…'}
                    </p>
                </div>
            </div>
        );
    }

    if (loadStatus === 'error') {
        const reauth = syncStatus === 'reauth';
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="max-w-sm text-center space-y-4">
                    <div className="flex justify-center">
                        <Logo size={48} />
                    </div>
                    <h1 className="text-lg font-semibold text-foreground">
                        {reauth ? 'Reconnect your Google account' : "We couldn't open your spreadsheet"}
                    </h1>
                    <p className="text-sm text-muted-foreground">{loadError}</p>
                    <button
                        onClick={() => (reauth ? signIn('google', { callbackUrl: '/dashboard' }) : loadData())}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        {reauth ? 'Reconnect Google' : 'Try again'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface">
            <Sidebar />
            <main className="lg:ml-72 min-h-screen">
                <SyncBanner />
                <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
            </main>
        </div>
    );
}
