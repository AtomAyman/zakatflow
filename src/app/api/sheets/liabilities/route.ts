import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLiabilities, addLiability, deleteLiability, updateLiability } from '@/lib/sheets';

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
        const liabilities = await getLiabilities(spreadsheetId, session.accessToken);
        return NextResponse.json({ data: liabilities });
    } catch (error) {
        console.error('Get liabilities error:', error);
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
        const liabilityData = await request.json();
        let liability;

        if (backupSpreadsheetId) {
            const [primaryLiability] = await Promise.all([
                addLiability(spreadsheetId, session.accessToken, liabilityData),
                addLiability(backupSpreadsheetId, session.accessToken, liabilityData).catch(e => console.error('Backup addLiability error:', e))
            ]);
            liability = primaryLiability;
        } else {
            liability = await addLiability(spreadsheetId, session.accessToken, liabilityData);
        }

        return NextResponse.json({ data: liability });
    } catch (error) {
        console.error('Add liability error:', error);
        return NextResponse.json(
            { error: 'Failed to add liability' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
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
        const liabilityData = await request.json();

        if (backupSpreadsheetId) {
            await Promise.all([
                updateLiability(spreadsheetId, session.accessToken, liabilityData),
                updateLiability(backupSpreadsheetId, session.accessToken, liabilityData).catch(e => console.error('Backup updateLiability error:', e))
            ]);
        } else {
            await updateLiability(spreadsheetId, session.accessToken, liabilityData);
        }

        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Update liability error:', error);
        return NextResponse.json(
            { error: 'Failed to update liability' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
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
        const { id } = await request.json();

        if (backupSpreadsheetId) {
            await Promise.all([
                deleteLiability(spreadsheetId, session.accessToken, id),
                deleteLiability(backupSpreadsheetId, session.accessToken, id).catch(e => console.error('Backup deleteLiability error:', e))
            ]);
        } else {
            await deleteLiability(spreadsheetId, session.accessToken, id);
        }

        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Delete liability error:', error);
        return NextResponse.json(
            { error: 'Failed to delete liability' },
            { status: 500 }
        );
    }
}
