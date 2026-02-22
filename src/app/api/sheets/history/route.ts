import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getHistory, addHistoryEntry } from '@/lib/sheets';

function getSpreadsheetId(request: NextRequest): string | null {
    return request.headers.get('x-spreadsheet-id');
}

function getBackupSpreadsheetId(request: NextRequest): string | null {
    return request.headers.get('x-backup-spreadsheet-id');
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = getSpreadsheetId(request);
    if (!spreadsheetId) {
        return NextResponse.json({ data: [] });
    }

    try {
        const history = await getHistory(spreadsheetId, session.accessToken);
        return NextResponse.json({ data: history });
    } catch (error) {
        console.error('Get history error:', error);
        return NextResponse.json({ data: [] });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = getSpreadsheetId(request);
    const backupSpreadsheetId = getBackupSpreadsheetId(request);
    if (!spreadsheetId) {
        return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 400 });
    }

    try {
        const entry = await request.json();

        if (backupSpreadsheetId) {
            await Promise.all([
                addHistoryEntry(spreadsheetId, session.accessToken, entry),
                addHistoryEntry(backupSpreadsheetId, session.accessToken, entry).catch(e => console.error('Backup addHistory error:', e))
            ]);
        } else {
            await addHistoryEntry(spreadsheetId, session.accessToken, entry);
        }

        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Add history error:', error);
        return NextResponse.json(
            { error: 'Failed to add history entry' },
            { status: 500 }
        );
    }
}
