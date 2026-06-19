import { NextResponse } from 'next/server';
import { openDB } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const db = await openDB();
    const rows = await db.all("SELECT * FROM tenders WHERE isPostulated = 1");
    
    // Parse JSON drafts
    const postulations = rows.map(r => ({
        ...r,
        postulationDraft: r.postulationDraft ? JSON.parse(r.postulationDraft) : {}
    }));

    return NextResponse.json({ success: true, data: postulations });
  } catch (error) {
    console.error('Error fetching postulations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
