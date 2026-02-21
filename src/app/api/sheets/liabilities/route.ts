import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLiabilities, addLiability, deleteLiability } from '@/lib/sheets';

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
    if (!spreadsheetId) {
        return NextResponse.json({ error: 'No spreadsheet ID' }, { status: 400 });
    }

    try {
        const liabilityData = await request.json();
        const liability = await addLiability(spreadsheetId, session.accessToken, liabilityData);
        return NextResponse.json({ data: liability });
    } catch (error) {
        console.error('Add liability error:', error);
        return NextResponse.json(
            { error: 'Failed to add liability' },
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
        await deleteLiability(spreadsheetId, session.accessToken, id);
        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Delete liability error:', error);
        return NextResponse.json(
            { error: 'Failed to delete liability' },
            { status: 500 }
        );
    }
}
