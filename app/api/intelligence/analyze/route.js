import { NextResponse } from 'next/server';
import { calculateOptimalBid } from '@/lib/intelligence';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cost = parseFloat(searchParams.get('cost'));
    const rubro_id = searchParams.get('rubro_id') || 'tec';
    const region = searchParams.get('region') || 'Region Metropolitana';
    const comprador_name = searchParams.get('comprador') || null;

    if (isNaN(cost) || cost <= 0) {
      return NextResponse.json({ error: 'Falta el parámetro de costo (cost) o es inválido' }, { status: 400 });
    }

    const analysis = calculateOptimalBid(cost, rubro_id, region, comprador_name);

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error("Error en API /analyze:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
