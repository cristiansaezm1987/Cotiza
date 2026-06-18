import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { queries } = await request.json();

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: 'Falta el parámetro de búsqueda (queries)' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const finalMap = {};

    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        
        const prompt = `El siguiente texto es un requerimiento de compra o un ítem: "${query}".
Primero, identifica de manera inteligente cuál es el producto físico principal que se necesita comprar (ignora texto burocrático como "adquisición de", "provisión", etc.).
Luego, busca 3 productos reales en mercadolibre.cl para ese producto. 
Usa la herramienta googleSearch para obtener enlaces reales a "articulo.mercadolibre.cl" y sus precios reales.
Debes devolver ESTRICTAMENTE un JSON válido que sea un arreglo de objetos, con la siguiente estructura:
[
  {
    "title": "Nombre del producto encontrado",
    "price": 150000,
    "permalink": "https://articulo.mercadolibre.cl/MLC-12345678-producto-_JM"
  }
]
Si no encuentras productos, devuelve un arreglo vacío []. NO agregues texto adicional, solo el JSON.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                tools: [{ googleSearch: {} }]
            });

            let jsonText = response.text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.substring(7, jsonText.length - 3);
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.substring(3, jsonText.length - 3);
            }

            let parsedResults = [];
            try {
                parsedResults = JSON.parse(jsonText);
            } catch (e) {
                console.error("Gemini failed to return JSON for query:", query);
            }

            const formattedResults = parsedResults.map(item => ({
                id: `MLC-GEMINI-${Math.floor(Math.random() * 1000000000)}`,
                title: item.title || `${query} (Encontrado)`,
                description: 'Producto encontrado vía IA.',
                price: item.price || 0,
                currency: 'CLP',
                thumbnail: 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__small.png',
                permalink: item.permalink || '#',
                condition: 'new',
                shipping: 'Calculado',
                source: 'Búsqueda Inteligente'
            })).filter(item => item.price > 0 && item.permalink !== '#');

            finalMap[i] = formattedResults;

        } catch (apiErr) {
            console.error("Error from Gemini API for query", query, apiErr);
            finalMap[i] = [];
        }
        
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ success: true, resultsMap: finalMap });

  } catch (error) {
    console.error("Error en Búsqueda Bulk de Mercado Libre (Gemini):", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
