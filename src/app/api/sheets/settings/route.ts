import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/sheets';
import { DEFAULT_SETTINGS } from '@/lib/types';

// Helper to get spreadsheet ID from cookie/header
function getSpreadsheetId(request: NextRequest): string | null {
    return request.headers.get('x-spreadsheet-id');
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = getSpreadsheetId(request);
    if (!spreadsheetId) {
        return NextResponse.json({ data: DEFAULT_SETTINGS });
    }

    try {
        const settings = await getSettings(spreadsheetId, session.accessToken);
        return NextResponse.json({ data: settings });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json({ data: DEFAULT_SETTINGS });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = getSpreadsheetId(request);
    if (!spreadsheetId) {
        return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 400 });
    }

    try {
        const settings = await request.json();
        await saveSettings(spreadsheetId, session.accessToken, settings);
        return NextResponse.json({ data: settings });
    } catch (error) {
        console.error('Save settings error:', error);
        return NextResponse.json(
            { error: 'Failed to save settings' },
            { status: 500 }
        );
    }
}
