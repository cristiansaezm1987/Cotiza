import { NextResponse } from 'next/server';
import { openDB } from '../../../lib/db';

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = parseInt(searchParams.get('page')) || 1;
    const regionParam = searchParams.get('region') || '';
    const searchKeyword = searchParams.get('search') || '';
    const statusParam = searchParams.get('status') || '';
    
    const db = await openDB();
    
    let query = "SELECT * FROM tenders WHERE 1=1";
    let countQuery = "SELECT COUNT(*) as count FROM tenders WHERE 1=1";
    const params = [];
    
    if (regionParam && regionParam !== 'all') {
      query += " AND (region LIKE ? OR region = ?)";
      countQuery += " AND (region LIKE ? OR region = ?)";
      params.push(`%${regionParam}%`, regionParam);
    }
    
    if (searchKeyword) {
      query += " AND (name LIKE ? OR organization LIKE ?)";
      countQuery += " AND (name LIKE ? OR organization LIKE ?)";
      params.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
    }
    
    if (statusParam && statusParam !== 'all') {
      query += " AND status = ?";
      countQuery += " AND status = ?";
      params.push(statusParam);
    }
    
    query += " ORDER BY date DESC, id DESC LIMIT 20 OFFSET ?";
    const countParams = [...params]; // params before adding offset
    params.push((pageParam - 1) * 20);
    
    const [records, countResult] = await Promise.all([
      db.all(query, params),
      db.get(countQuery, countParams)
    ]);
    
    const totalCount = countResult.count;
    
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

