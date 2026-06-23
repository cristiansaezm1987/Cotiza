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
            const res = await fetch(`http://127.0.0.1:8000/api/search/?q=${encodeURIComponent(query)}`);
            
            if (!res.ok) {
                console.error(`Django API error for query ${query}: ${res.status}`);
                return { index, results: [] };
            }

            const data = await res.json();
            
            // Tomamos los top 10 de meli_results
            const results = (data.meli_results || []).slice(0, 10).map(item => ({
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

            return { index, results };
        } catch (err) {
            console.error(`Fetch error for query ${query}:`, err);
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
