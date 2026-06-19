import { NextResponse } from 'next/server';
import { openDB } from '../../../lib/db';

export async function GET(request) {
  try {
    const db = await openDB();
    
    let query = "SELECT * FROM tenders ORDER BY date DESC, id DESC";
    
    let records = [];
    if (db.client) {
        const res = await db.client.execute({ sql: query, args: [] });
        records = res.rows || [];
    } else {
        records = await db.all(query, []);
    }
    
    const totalCount = records.length;
    
    const formattedData = records.map(item => ({
      id: item.id,
      name: item.name,
      status: item.status,
      statusName: item.statusName,
      date: item.date,
      price: item.price,
      organization: item.organization,
      region: item.region,
      closeDate: item.closeDate,
      deliveryDays: item.deliveryDays,
      callNumber: item.callNumber
    }));

    return NextResponse.json({ success: true, data: formattedData, totalCount });

  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
