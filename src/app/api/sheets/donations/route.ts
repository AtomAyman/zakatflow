import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDonations, addDonation, deleteDonation } from '@/lib/sheets';
import type { DonationEntry } from '@/lib/types';

function getSpreadsheetId(request: NextRequest): string | null {
    return request.headers.get('x-spreadsheet-id');
}

function getBackupSpreadsheetId(request: NextRequest): string | null {
    return request.headers.get('x-backup-spreadsheet-id');
}

const CATEGORIES: DonationEntry['category'][] = ['Zakat', 'Sadaqah', 'Other'];

function parseDonation(body: unknown): DonationEntry | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (typeof b.date !== 'string' || !b.date) return null;
    if (!CATEGORIES.includes(b.category as DonationEntry['category'])) return null;

    return {
        id: typeof b.id === 'string' ? b.id : '',
        zakatYear: typeof b.zakatYear === 'string' ? b.zakatYear : undefined,
        date: b.date,
        amount,
        category: b.category as DonationEntry['category'],
        recipient: typeof b.recipient === 'string' ? b.recipient : '',
        notes: typeof b.notes === 'string' ? b.notes : '',
    };
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
        const donations = await getDonations(spreadsheetId, session.accessToken);
        return NextResponse.json({ data: donations });
    } catch (error) {
        console.error('Get donations error:', error);
        return NextResponse.json({ error: 'Failed to load donations' }, { status: 500 });
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

    const donation = parseDonation(await request.json().catch(() => null));
    if (!donation) {
        return NextResponse.json({ error: 'Invalid donation' }, { status: 400 });
    }

    try {
        // Save to the primary first so the backup gets the same ID.
        const saved = await addDonation(spreadsheetId, session.accessToken, donation);
        if (backupSpreadsheetId) {
            await addDonation(backupSpreadsheetId, session.accessToken, saved).catch((e) =>
                console.error('Backup addDonation error:', e)
            );
        }
        return NextResponse.json({ data: saved });
    } catch (error) {
        console.error('Add donation error:', error);
        return NextResponse.json({ error: 'Failed to add donation' }, { status: 500 });
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

    const body = await request.json().catch(() => null);
    const id = body && typeof body.id === 'string' ? body.id : '';
    if (!id) {
        return NextResponse.json({ error: 'Missing donation ID' }, { status: 400 });
    }

    try {
        await Promise.all([
            deleteDonation(spreadsheetId, session.accessToken, id),
            backupSpreadsheetId
                ? deleteDonation(backupSpreadsheetId, session.accessToken, id).catch((e) =>
                    console.error('Backup deleteDonation error:', e)
                )
                : Promise.resolve(),
        ]);
        return NextResponse.json({ data: { success: true } });
    } catch (error) {
        console.error('Delete donation error:', error);
        return NextResponse.json({ error: 'Failed to delete donation' }, { status: 500 });
    }
}
