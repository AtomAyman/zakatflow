'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Logo from '@/components/Logo';
import { useZakatStore } from '@/lib/store';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { setSpreadsheetId, setBackupSpreadsheetId, setInitialized, fetchAllData, spreadsheetId } = useZakatStore();
    const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'ready'>('idle');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    // Initialize spreadsheet on first load
    useEffect(() => {
        if (session?.accessToken && initStatus === 'idle') {
            setInitStatus('loading');

            fetch('/api/sheets/init', { method: 'POST' })
                .then((res) => res.json())
                .then((data) => {
                    if (data.data?.spreadsheetId) {
                        setSpreadsheetId(data.data.spreadsheetId);
                        if (data.data.backupSpreadsheetId) {
                            setBackupSpreadsheetId(data.data.backupSpreadsheetId);
                        }
                        setInitStatus('ready');
                    }
                })
                .catch((err) => {
                    console.error('Init error:', err);
                    setInitStatus('ready'); // Still show UI with defaults
                });
        }
    }, [session, initStatus, setSpreadsheetId]);

    // Fetch data once spreadsheet is ready
    useEffect(() => {
        if (initStatus === 'ready' && spreadsheetId) {
            fetchAllData();
            setInitialized(true);
        }
    }, [initStatus, spreadsheetId, fetchAllData, setInitialized]);

    if (status === 'loading' || initStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center mesh-gradient">
                <div className="text-center">
                    <div className="animate-pulse">
                        <Logo size={48} />
                    </div>
                    <p className="text-sm text-white/40">
                        {initStatus === 'loading'
                            ? 'Setting up your dashboard...'
                            : 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen mesh-gradient">
            <Sidebar />
            <main className="lg:ml-72 min-h-screen">
                <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
            </main>
        </div>
    );
}
