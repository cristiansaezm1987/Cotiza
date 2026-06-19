import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Falta el texto a analizar' }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Actúa como un experto en compras públicas. A continuación te presento un texto que corresponde a una licitación de Mercado Público de Chile.
Tu tarea es extraer ÚNICAMENTE los nombres limpios de los productos físicos reales que se están solicitando cotizar, para poder buscarlos directamente en Mercado Libre u otro buscador de e-commerce.

Reglas:
1. Ignora palabras burocráticas (ej: "ADQUISICIÓN DE", "CONTRATACIÓN DE", "PROVISIÓN", "SUMINISTRO").
2. Ignora servicios (ej: "Servicio de flete", "Instalación", "Mantención").
3. Solo devuelve el producto y su característica principal si es relevante (ej: "Notebook i7 16GB", "Resma tamaño carta", "Toner Brother TN-1060").
4. Devuelve ESTRICTAMENTE un JSON válido que sea un arreglo de strings. Ejemplo: ["Notebook HP i7", "Mouse inalámbrico Logitech"]
5. Si no hay productos físicos, devuelve un arreglo vacío []. NO agregues texto adicional, saludos ni explicaciones, solo el arreglo JSON.

Texto de la licitación:
"""
${text}
"""`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
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
            console.error("Gemini failed to return JSON:", jsonText);
            return NextResponse.json({ error: 'Error al procesar la respuesta de la IA' }, { status: 500 });
        }

        return NextResponse.json({ success: true, products: parsedResults });

    } catch (error) {
        console.error("Error en extracción de productos (Gemini):", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
