import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { cost, productName, historyData } = body;

        if (!cost || !productName) {
            return NextResponse.json({ success: false, error: 'Faltan datos de producto o costo.' }, { status: 400 });
        }

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `
        Eres un experto analista de precios y ventas para el Estado de Chile (Mercado Público - Compra Ágil).
        Debes calcular una estrategia de precio sugerido y justificarla en 2 o 3 oraciones, y luego redactar una propuesta formal breve.

        INFORMACIÓN:
        - Producto: ${productName}
        - Mi Costo Base (desde proveedor externo): $${cost.toLocaleString('es-CL')}
        - Histórico del Estado (últimos 3 días para este producto):
          Promedio pagado: $${historyData?.average?.toLocaleString('es-CL') || 'Sin datos'}
          Máximo pagado: $${historyData?.max?.toLocaleString('es-CL') || 'Sin datos'}

        INSTRUCCIONES:
        1. Compara "Mi Costo Base" con el Histórico del Estado.
        2. Determina un precio de venta "Neto Sugerido" (sin IVA) que maximice el margen de ganancia pero que siga siendo competitivo comparado con el promedio histórico. Si el costo base es mayor que el promedio histórico, sugiere un margen mínimo de 15% sobre el costo.
        3. Explica brevemente por qué sugieres ese precio.
        4. Redacta un pequeño texto de 1 o 2 líneas para poner en el cuadro de "Observaciones" de la oferta.

        Responde ÚNICAMENTE con un JSON con este formato exacto:
        {
            "suggestedPrice": 15000,
            "reasoning": "Texto explicativo...",
            "offerText": "Texto formal para la oferta..."
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        let text = response.text.trim();
        console.log("Gemini Raw Response:", text);
        
        // Limpiar backticks si Gemini los incluye
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("JSON parse error:", e.message, "Text:", text);
            // Fallback object to prevent 500 error
            const margin = cost > 0 ? cost * 1.4 : 10000;
            data = {
                suggestedPrice: Math.round(margin),
                reasoning: "Se ha aplicado un margen predeterminado de 40% debido a un problema interpretando la sugerencia de la IA.",
                offerText: "Cumple íntegramente con las especificaciones técnicas solicitadas en las bases."
            };
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("Generate Quote Error:", error);
        return NextResponse.json({ success: false, error: 'Error generando la cotización con IA.' }, { status: 500 });
    }
}
