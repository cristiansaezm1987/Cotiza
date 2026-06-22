import { NextResponse } from 'next/server';
import { extractKeywordsForItems } from '../../../../lib/intelligence';

export async function POST(request) {
    try {
        const body = await request.json();
        const { tenderName, items } = body;
        
        if (!tenderName || !items || !Array.isArray(items)) {
            return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
        }

        const keywordsMap = await extractKeywordsForItems(tenderName, items);
        
        return NextResponse.json({ success: true, data: keywordsMap });
    } catch (error) {
        console.error('Error in extract-item-keywords API:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
