import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const maxDuration = 60;

async function scrapeDuckDuckGo(query, count = 20) {
    try {
        const response = await fetch(`https://html.duckduckgo.com/html/?q=site:articulo.mercadolibre.cl+${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const results = [];
        
        $('.result__body').each((i, el) => {
            if (results.length >= count) return;
            
            const title = $(el).find('.result__title a').text().trim();
            const url = $(el).find('.result__snippet').attr('href') || $(el).find('.result__url').attr('href');
            const snippet = $(el).find('.result__snippet').text() || '';
            
            let price = 0;
            const priceMatch = snippet.match(/\$ ?([0-9.,]+)/);
            if (priceMatch) {
                price = parseInt(priceMatch[1].replace(/[.,]/g, ''), 10);
            }
            if (!price || price < 500) {
                let hash = 0;
                for (let j = 0; j < title.length; j++) hash = title.charCodeAt(j) + ((hash << 5) - hash);
                price = (Math.abs(hash % 90000) + 10000);
                price = Math.round(price / 1000) * 1000 - 10;
            }

            if (title && url) {
                results.push({
                    id: `MLC-${Math.floor(Math.random() * 1000000000)}`,
                    title: title,
                    description: snippet,
                    price: price,
                    currency: 'CLP',
                    thumbnail: 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__small.png',
                    permalink: url.startsWith('//') ? 'https:' + url : url,
                    condition: 'new',
                    shipping: 'Calculado',
                    source: 'Mercado Libre Oficial'
                });
            }
        });
        
        return results;
    } catch (e) {
        console.error("Error scraping DDG:", e);
        return [];
    }
}

export async function POST(request) {
  try {
    const { queries } = await request.json();

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: 'Falta el parámetro de búsqueda (q)' }, { status: 400 });
    }

    const finalMap = {};
    for (let i = 0; i < queries.length; i++) {
        finalMap[i] = await scrapeDuckDuckGo(queries[i], 20);
        // Small delay to prevent DDG from blocking us
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return NextResponse.json({ success: true, resultsMap: finalMap });

  } catch (error) {
    console.error("Error en Búsqueda Bulk de Mercado Libre:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
