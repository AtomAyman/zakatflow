import { NextResponse } from 'next/server';
import { getMetalPrices } from '@/lib/price-service';

export async function GET() {
    try {
        const prices = await getMetalPrices();
        return NextResponse.json({ data: prices });
    } catch (error) {
        console.error('Price fetch error:', error);
        return NextResponse.json({
            data: {
                goldPerGram: 88,
                silverPerGram: 1.05,
                lastUpdated: new Date().toISOString(),
            },
        });
    }
}
