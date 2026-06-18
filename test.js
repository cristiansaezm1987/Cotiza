require('dotenv').config({path: '.env.local'});
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const prompt = "Busca 3 productos reales en mercadolibre.cl para 'Tóner 30A'. Usa la herramienta googleSearch para obtener enlaces y precios reales. Devuelve un JSON estricto con un arreglo de objetos: [{title: string, price: number, permalink: string}]";
ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt, 
    tools: [{ googleSearch: {} }]
}).then(res => console.log(res.text)).catch(console.error);
