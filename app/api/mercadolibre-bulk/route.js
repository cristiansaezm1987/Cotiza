import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { queries } = await request.json();

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: 'Falta el parámetro de búsqueda (queries)' }, { status: 400 });
    }

    const finalMap = {};

    // Ejecutamos las búsquedas de forma secuencial (o en lotes pequeños) para no saturar el servidor de desarrollo Django local
    const resolvedSearches = [];
    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        try {
            const djangoUrl = process.env.MELIPULSE_API_URL || 'http://127.0.0.1:8000';
            
            const fetchFromDjango = async (q) => {
                const res = await fetch(`${djangoUrl}/api/search/?q=${encodeURIComponent(q)}`);
                if (!res.ok) return [];
                const data = await res.json();
                return (data.meli_results || []).slice(0, 10).map(item => ({
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
            };

            let results = await fetchFromDjango(query);
            
            if (results.length === 0) {
                let cleaned = query.replace(/\b(original|nuevo|alternativo|compatible|genuino|unidad|de|para)\b/gi, '').replace(/\s+/g, ' ').trim();
                if (cleaned && cleaned !== query) {
                    results = await fetchFromDjango(cleaned);
                }
                if (results.length === 0) {
                    let words = (cleaned || query).split(' ');
                    while (words.length > 2 && results.length === 0) {
                        words.pop();
                        results = await fetchFromDjango(words.join(' '));
                    }
                }
            }

            resolvedSearches.push({ index: i, results });
        } catch (err) {
            console.error(`Fetch error for query ${query}:`, err);
            resolvedSearches.push({ index: i, results: [] });
        }
    }

    // Fix Turbopack cache issue
    resolvedSearches.forEach(search => {
        finalMap[search.index] = search.results;
    });

    return NextResponse.json({ success: true, resultsMap: finalMap });

  } catch (error) {
    console.error("Error en Búsqueda Bulk de Mercado Libre:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
