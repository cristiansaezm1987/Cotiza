import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Falta el parámetro de búsqueda (q)' }, { status: 400 });
    }

    const res = await fetch(`https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=10`);
    
    if (!res.ok) {
        console.error(`ML API error for query ${query}: ${res.status}`);
        return NextResponse.json({ success: false, error: 'Error en API de Mercado Libre' }, { status: res.status });
    }

    const data = await res.json();
    const results = (data.results || []).map(item => ({
        id: item.id,
        title: item.title,
        description: 'Encontrado en Mercado Libre',
        price: item.price || 0,
        currency: item.currency_id || 'CLP',
        thumbnail: item.thumbnail ? item.thumbnail.replace('http://', 'https://') : 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__small.png',
        permalink: item.permalink,
        condition: item.condition,
        shipping: item.shipping?.free_shipping ? 'Envío gratis' : 'Calculado',
        source: 'MercadoLibre API'
    }));

    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error("Error en Búsqueda Manual de Mercado Libre:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
