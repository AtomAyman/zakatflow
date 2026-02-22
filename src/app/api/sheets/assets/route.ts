import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAssets, addAsset, deleteAsset, updateAsset } from '@/lib/sheets';

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
    if (!spreadsheetId) {
        return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 400 });
    }

    try {
        const assetData = await request.json();
        const asset = await addAsset(spreadsheetId, session.accessToken, assetData);
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
    if (!spreadsheetId) {
        return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 400 });
    }

    try {
        const assetData = await request.json();
        await updateAsset(spreadsheetId, session.accessToken, assetData);
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
    if (!spreadsheetId) {
        return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 400 });
    }

    try {
        const { id } = await request.json();
        await deleteAsset(spreadsheetId, session.accessToken, id);
        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Delete asset error:', error);
        return NextResponse.json(
            { error: 'Failed to delete asset' },
            { status: 500 }
        );
    }
}
