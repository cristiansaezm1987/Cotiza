import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Falta el parámetro de búsqueda (q)' }, { status: 400 });
    }

    const djangoUrl = process.env.MELIPULSE_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${djangoUrl}/api/search/?q=${encodeURIComponent(query)}`);
    
    if (!res.ok) {
        console.error(`Django API error for query ${query}: ${res.status}`);
        return NextResponse.json({ success: false, error: 'Error en Django Backend' }, { status: res.status });
    }

    const data = await res.json();
    
    // El backend de Django devuelve { meli_results: [...], other_results: [...] }
    const results = (data.meli_results || []).map(item => ({
        id: `django-${Math.random()}`,
        title: item.title,
        description: item.raw_shipping || 'Encontrado por MeliPulse Django',
        price: item.price || 0,
        currency: item.currency || 'CLP',
        thumbnail: item.image || 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__small.png',
        permalink: item.permalink,
        condition: 'new',
        shipping: item.free_shipping ? 'Envío gratis' : 'Calculado',
        source: 'MeliPulse Django'
    }));

    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error("Error en Búsqueda Manual de Mercado Libre:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
