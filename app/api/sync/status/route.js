import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const status = getStatus();
        return NextResponse.json({ success: true, data: status });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
