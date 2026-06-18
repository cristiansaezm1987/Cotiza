import { NextResponse } from 'next/server';
import { openDB } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await openDB();
        const stats = await db.get(`
            SELECT 
                COUNT(*) as totalCount,
                MAX(lastUpdated) as lastSync,
                MIN(date) as oldestDate,
                MAX(date) as newestDate
            FROM tenders
        `);
        return NextResponse.json({ success: true, data: stats });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
