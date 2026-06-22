require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const tenderName = "PLA PARA IMPRESORAS Y MANTENCION";
    const items = [
        {nombre: "Bandas de impresión", descripcion: "PLA-CYAN 1 KILO"},
        {nombre: "Bandas de impresión", descripcion: "PLA-BLANCO 1 KILO"}
    ];
    
    const systemPrompt = `Eres un asistente experto en analizar licitaciones de Mercado Público Chile.
En Mercado Público, los compradores a menudo se equivocan al elegir el "Nombre" del ítem y seleccionan categorías genéricas o erróneas (ej. "Bandas de impresión", "Servicios de limpieza"). Sin embargo, detallan el producto físico real que desean comprar en la "Desc" (ej. "PLA-CYAN 1 KILO") o en la "Licitación".

Tu objetivo: Leer la Licitación, el Nombre del Ítem y su Desc, y deducir exactamente QUÉ PRODUCTO COMERCIAL se necesita para buscarlo en Mercado Libre.

REGLAS OBLIGATORIAS:
1. SIEMPRE confía más en la "Desc" y en la "Licitación" que en el "Nombre" del ítem.
2. Si el "Nombre" es genérico o contradictorio (ej. Nombre: "Bandas de impresión", Desc: "PLA-CYAN 1 KILO"), DEBES IGNORAR EL NOMBRE y basarte 100% en la Desc y Licitación (En este caso el resultado debe ser algo como "Filamento PLA Cyan").
3. Extrae un término de búsqueda de máximo 5 palabras.
4. Elimina verbos y palabras innecesarias ("adquisición", "suministro", "requiere", "para").

Licitación: "${tenderName}"
Ítems:
${items.map((it, idx) => `[${idx}] Categoría del portal (Frecuentemente errónea): "${it.nombre}" | Descripción técnica real: "${it.descripcion}"`).join('\n')}

Devuelve SOLO un objeto JSON, donde la clave es el índice y el valor es el término de búsqueda comercial.
Ejemplo de salida correcta:
{"0": "Filamento PLA Cyan 1 Kilo", "1": "Manguera jardín 1/2"}
NO agregues backticks ni explicaciones.`;

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(systemPrompt);
    console.log(response.response.text());
}

test().catch(console.error);
