import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAssets, addAsset, deleteAsset, updateAsset } from '@/lib/sheets';

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
        const assets = await getAssets(spreadsheetId, session.accessToken);
        return NextResponse.json({ data: assets });
    } catch (error) {
        console.error('Get assets error:', error);
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
        const assetData = await request.json();
        let asset;

        if (backupSpreadsheetId) {
            const [primaryAsset] = await Promise.all([
                addAsset(spreadsheetId, session.accessToken, assetData),
                addAsset(backupSpreadsheetId, session.accessToken, assetData).catch(e => console.error('Backup addAsset error:', e))
            ]);
            asset = primaryAsset;
        } else {
            asset = await addAsset(spreadsheetId, session.accessToken, assetData);
        }

        return NextResponse.json({ data: asset });
    } catch (error) {
        console.error('Add asset error:', error);
        return NextResponse.json(
            { error: 'Failed to add asset' },
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
        const assetData = await request.json();

        if (backupSpreadsheetId) {
            await Promise.all([
                updateAsset(spreadsheetId, session.accessToken, assetData),
                updateAsset(backupSpreadsheetId, session.accessToken, assetData).catch(e => console.error('Backup updateAsset error:', e))
            ]);
        } else {
            await updateAsset(spreadsheetId, session.accessToken, assetData);
        }

        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Update asset error:', error);
        return NextResponse.json(
            { error: 'Failed to update asset' },
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
                deleteAsset(spreadsheetId, session.accessToken, id),
                deleteAsset(backupSpreadsheetId, session.accessToken, id).catch(e => console.error('Backup deleteAsset error:', e))
            ]);
        } else {
            await deleteAsset(spreadsheetId, session.accessToken, id);
        }

        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Delete asset error:', error);
        return NextResponse.json(
            { error: 'Failed to delete asset' },
            { status: 500 }
        );
    }
}
