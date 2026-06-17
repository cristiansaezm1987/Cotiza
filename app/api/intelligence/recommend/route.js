import { NextResponse } from 'next/server';
import { recommendTenders } from '@/lib/intelligence';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const budget = parseFloat(searchParams.get('budget'));
    const rubro_id = searchParams.get('rubro_id') || null;
    const region = searchParams.get('region') || null;

    if (isNaN(budget) || budget <= 0) {
      return NextResponse.json({ error: 'Falta el parámetro de presupuesto (budget) o es inválido' }, { status: 400 });
    }

    const recommendations = recommendTenders(budget, rubro_id, region);

    return NextResponse.json({ success: true, data: recommendations });
  } catch (error) {
    console.error("Error en API /recommend:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
