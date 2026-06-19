import { NextResponse } from 'next/server';
import { openDB } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await openDB();
        
        const base1Stats = await db.get(`
            SELECT 
                COUNT(*) as totalCount,
                MAX(lastUpdated) as lastSync,
                MIN(date) as oldestDate,
                MAX(date) as newestDate
            FROM tenders
            WHERE callNumber = 1 OR callNumber IS NULL
        `);
        
        const base2Stats = await db.get(`
            SELECT 
                COUNT(*) as totalCount,
                MAX(lastUpdated) as lastSync,
                MIN(date) as oldestDate,
                MAX(date) as newestDate
            FROM tenders
            WHERE callNumber = 2
        `);
        
        const globalStats = await db.get(`
            SELECT 
                COUNT(*) as totalCount,
                MAX(lastUpdated) as lastSync,
                MIN(date) as oldestDate,
                MAX(date) as newestDate
            FROM tenders
        `);

        return NextResponse.json({ 
            success: true, 
            data: {
                global: globalStats,
                base1: base1Stats,
                base2: base2Stats
            } 
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
