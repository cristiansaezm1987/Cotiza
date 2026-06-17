require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function main() {
    console.log("Key length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Hola, responde con {\"ok\": true}",
        });
        console.log("Success:", response.text);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
