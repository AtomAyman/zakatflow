import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializeSheet } from '@/lib/sheets';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const spreadsheetId = await initializeSheet(session.accessToken);
        return NextResponse.json({ data: { spreadsheetId } });
    } catch (error) {
        console.error('Sheet init error:', error);
        return NextResponse.json(
            { error: 'Failed to initialize sheet' },
            { status: 500 }
        );
    }
}
