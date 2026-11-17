import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWasiyyah, saveWasiyyah } from '@/lib/wasiyyah-sheets';
import { DEFAULT_WASIYYAH, type WasiyyahData } from '@/lib/wasiyyah-types';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = request.headers.get('x-spreadsheet-id');
    if (!spreadsheetId) return NextResponse.json({ data: DEFAULT_WASIYYAH });

    try {
        const data = await getWasiyyah(spreadsheetId, session.accessToken);
        return NextResponse.json({ data });
    } catch (error) {
        console.error('Get wasiyyah error:', error);
        return NextResponse.json({ error: 'Failed to load will' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = request.headers.get('x-spreadsheet-id');
    const backupSpreadsheetId = request.headers.get('x-backup-spreadsheet-id');
    if (!spreadsheetId) {
        return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 400 });
    }

    try {
        const data = (await request.json()) as WasiyyahData;
        await Promise.all([
            saveWasiyyah(spreadsheetId, session.accessToken, data),
            backupSpreadsheetId
                ? saveWasiyyah(backupSpreadsheetId, session.accessToken, data).catch((e) =>
                    console.error('Backup saveWasiyyah error:', e))
                : Promise.resolve(),
        ]);
        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Save wasiyyah error:', error);
        return NextResponse.json({ error: 'Failed to save will' }, { status: 500 });
    }
}
