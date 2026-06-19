import { NextResponse } from 'next/server';
import { openDB } from '../../../../lib/db';

export async function POST(request) {
  try {
    const { id, isPostulated, draft, isBidded, bidStatus, biddedDate, biddedPrice, biddedMargin } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing tender ID' }, { status: 400 });
    }

    const db = await openDB();
    
    // Si isPostulated viene, actualizamos la postulación
    if (isPostulated !== undefined) {
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
    }

    // Si viene isBidded u otros campos de la fase de licitación
    if (isBidded !== undefined || bidStatus !== undefined) {
        let updateQuery = "UPDATE tenders SET ";
        let params = [];
        
        if (isBidded !== undefined) {
            updateQuery += "isBidded = ?, ";
            params.push(isBidded ? 1 : 0);
            
            // Si pasamos a isBidded = 1, quitamos isPostulated
            if (isBidded) {
                updateQuery += "isPostulated = 0, ";
            }
        }
        
        if (bidStatus !== undefined) {
            updateQuery += "bidStatus = ?, ";
            params.push(bidStatus);
        }
        if (biddedDate !== undefined) {
            updateQuery += "biddedDate = ?, ";
            params.push(biddedDate);
        }
        if (biddedPrice !== undefined) {
            updateQuery += "biddedPrice = ?, ";
            params.push(biddedPrice);
        }
        if (biddedMargin !== undefined) {
            updateQuery += "biddedMargin = ?, ";
            params.push(biddedMargin);
        }
        
        // Remover última coma y espacio
        updateQuery = updateQuery.slice(0, -2);
        updateQuery += " WHERE id = ?";
        params.push(id);
        
        await db.run(updateQuery, params);
    }

    return NextResponse.json({ success: true, message: 'Postulation updated successfully' });
  } catch (error) {
    console.error('Error saving postulation:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
