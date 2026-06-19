import { NextResponse } from 'next/server';
import { openDB } from '../../../../lib/db';

export async function POST(request) {
  try {
    const { id, isPostulated, draft } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing tender ID' }, { status: 400 });
    }

    const db = await openDB();
    
    const isPostulatedInt = isPostulated ? 1 : 0;

    if (draft !== undefined) {
        const draftStr = draft ? JSON.stringify(draft) : null;
        await db.run(
          `UPDATE tenders SET isPostulated = ?, postulationDraft = ? WHERE id = ?`,
          [isPostulatedInt, draftStr, id]
        );
    } else {
        await db.run(
          `UPDATE tenders SET isPostulated = ? WHERE id = ?`,
          [isPostulatedInt, id]
        );
    }

    return NextResponse.json({ success: true, message: 'Postulation updated successfully' });
  } catch (error) {
    console.error('Error saving postulation:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
