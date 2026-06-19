import { NextResponse } from 'next/server';
import { openDB } from '../../../../lib/db';

export async function POST(req) {
    try {
        const body = await req.json();
        const { id, isVetted, biScore, biReasons, descriptionPreview } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
        }

        const db = await openDB();
        
        await db.run(`
            UPDATE tenders 
            SET isVetted = ?, biScore = ?, biReasons = ?, descriptionPreview = ?
            WHERE id = ?
        `, [
            isVetted ? 1 : 0, 
            biScore || 0, 
            JSON.stringify(biReasons || []), 
            descriptionPreview || '', 
            id
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vetting Save API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
