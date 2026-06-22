import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { queries } = await request.json();

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: 'Falta el parámetro de búsqueda (queries)' }, { status: 400 });
    }

    const finalMap = {};

    // Ejecutamos las búsquedas en paralelo usando Promise.all para mayor velocidad
    const searchPromises = queries.map(async (query, index) => {
        try {
            const res = await fetch(`https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=3`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            if (!res.ok) {
                console.error(`ML API error for query ${query}: ${res.status}`);
                return { index, results: [] };
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

            return { index, results };
        } catch (err) {
            console.error(`Fetch error for ML API query ${query}:`, err);
            return { index, results: [] };
        }
    });

    const resolvedSearches = await Promise.all(searchPromises);

    resolvedSearches.forEach(search => {
        finalMap[search.index] = search.results;
    });

    return NextResponse.json({ success: true, resultsMap: finalMap });

  } catch (error) {
    console.error("Error en Búsqueda Bulk de Mercado Libre:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
