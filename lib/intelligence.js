import { DATA_FIXTURES } from './data_fixtures';

const { RUBROS, COMPRADORES, COMPETIDORES, PROVEEDORES_LOCALES, HISTORIAL_LICITACIONES, LICITACIONES_ACTIVAS } = DATA_FIXTURES;

export function getRubroById(rubro_id) {
    for (let r of RUBROS) {
        if (r.id === rubro_id) return r;
    }
    return RUBROS[0];
}

export function getCompradorByName(name) {
    for (let c of COMPRADORES) {
        if (c.nombre === name) return c;
    }
    return null;
}

export function calculateOptimalBid(cost, rubro_id, region, comprador_name = null) {
    const rubro = getRubroById(rubro_id);
    const comprador = getCompradorByName(comprador_name);
    
    let base_prob = rubro.probabilidad_base;
    let regional_bonus = 0.0;
    let buyer_multiplier = 1.0;
    
    if (comprador) {
        const perfil = comprador.perfil_adjudicacion;
        if (perfil === "Preferencia Local / Regional" && (comprador.region || "") === region) {
            regional_bonus = 0.12;
        }
        if (perfil === "Sensible al Precio") {
            buyer_multiplier = 1.2;
        } else if (perfil === "Orientado a Calidad / Tecnica") {
            buyer_multiplier = 0.7;
        }
    }
    
    const pricing_points = [];
    let best_expected_profit = -1.0;
    let suggested_price = cost * 1.10;
    let suggested_prob = 0.0;
    let suggested_margin = 0.0;
    
    for (let i = 1; i <= 40; i++) {
        let multiplier = 1.0 + (i * 0.01);
        let price = cost * multiplier;
        let margin_pct = (price - cost) / price;
        let target_margin = rubro.margen_promedio;
        let price_diff = margin_pct - target_margin;
        let k = 12.0 * buyer_multiplier;
        
        let prob = (base_prob * 1.15) / (1.0 + Math.exp(k * price_diff));
        prob += regional_bonus;
        prob = Math.max(0.05, Math.min(0.95, prob));
        
        let profit = (price - cost);
        let expected_profit = profit * prob;
        
        pricing_points.push({
            multiplier: parseFloat(multiplier.toFixed(2)),
            price: Math.round(price),
            margin_pct: parseFloat((margin_pct * 100).toFixed(1)),
            probability: parseFloat((prob * 100).toFixed(1)),
            expected_profit: Math.round(expected_profit)
        });
        
        if (expected_profit > best_expected_profit) {
            best_expected_profit = expected_profit;
            suggested_price = price;
            suggested_prob = prob;
            suggested_margin = margin_pct;
        }
    }
    
    const relevant_competitors = COMPETIDORES.filter(c => c.rubros.includes(rubro_id));
    
    return {
        cost,
        suggested_price: Math.round(suggested_price),
        suggested_prob: parseFloat((suggested_prob * 100).toFixed(1)),
        suggested_margin: parseFloat((suggested_margin * 100).toFixed(1)),
        suggested_multiplier: parseFloat((suggested_price / cost).toFixed(2)),
        pricing_points,
        competitors: relevant_competitors,
        regional_bonus_applied: regional_bonus > 0
    };
}

export function recommendTenders(budget, rubro_id = null, region = null) {
    const results = [];
    const budget_min = budget * 0.40;
    const budget_max = budget * 2.20;

    for (let licit of LICITACIONES_ACTIVAS) {
        let presupuesto = licit.presupuesto;
        if (!(presupuesto >= budget_min && presupuesto <= budget_max)) continue;
        if (rubro_id && licit.rubro !== rubro_id) continue;
        if (region && licit.region !== region) continue;

        let rubro = getRubroById(licit.rubro);
        let base_prob = rubro.probabilidad_base;

        let n_oferentes = licit.n_oferentes_esperados || 8;
        let competition_factor = Math.max(0.5, 1.0 - (n_oferentes / 30.0));

        let budget_ratio = budget / presupuesto;
        let budget_factor;
        if (budget_ratio >= 0.65 && budget_ratio <= 1.0) {
            budget_factor = 1.15;
        } else if (budget_ratio >= 0.50 && budget_ratio < 0.65) {
            budget_factor = 1.05;
        } else {
            budget_factor = 0.85;
        }

        let regional_bonus = 0.0;
        if (region && licit.region === region) {
            let comprador = getCompradorByName(licit.comprador);
            if (comprador && comprador.perfil_adjudicacion === "Preferencia Local / Regional") {
                regional_bonus = 0.10;
            }
        }

        let win_prob = base_prob * competition_factor * budget_factor + regional_bonus;
        win_prob = Math.max(0.05, Math.min(0.92, win_prob));

        let typical_margin = rubro.margen_promedio;
        let suggested_multiplier = 1.0 + typical_margin;
        let suggested_offer = Math.round(budget * suggested_multiplier);

        if (suggested_offer > presupuesto) {
            suggested_offer = Math.round(presupuesto * 0.94);
        }

        results.push({
            codigo: licit.codigo,
            nombre: licit.nombre,
            tipo: licit.tipo,
            rubro: licit.rubro,
            rubro_nombre: licit.rubro_nombre,
            comprador: licit.comprador,
            region: licit.region,
            ciudad: licit.ciudad,
            presupuesto: presupuesto,
            fecha_publicacion: licit.fecha_publicacion,
            fecha_cierre: licit.fecha_cierre,
            n_oferentes_esperados: n_oferentes,
            win_probability: parseFloat((win_prob * 100).toFixed(1)),
            suggested_offer: suggested_offer,
            estimated_margin_pct: suggested_offer > 0 ? parseFloat((((suggested_offer - budget) / suggested_offer) * 100).toFixed(1)) : 0,
            items: licit.items || []
        });
    }

    results.sort((a, b) => b.win_probability - a.win_probability);
    return results.slice(0, 12);
}

export async function analyzeTextRequirement(text, pdfs = []) {
    if (!process.env.GEMINI_API_KEY) {
        // Fallback heurístico si no hay API KEY
        const lowerText = text.toLowerCase();
        let complexity = "media";
        let keywords = [text.split(" ")[0] || ""];
        
        if (lowerText.includes("servidor") || lowerText.includes("licencia") || lowerText.includes("instalación")) {
            complexity = "alta";
        } else if (lowerText.includes("resma") || lowerText.includes("lápiz") || lowerText.includes("cuaderno")) {
            complexity = "baja";
        }
        
        return {
            complexity,
            keywords: [text.split(" ").slice(0, 3).join(" ")],
            summary: "Análisis heurístico (API de IA no configurada)",
            is_profitable: complexity !== "alta"
        };
    }

    let retries = 3;
    let lastError = null;

    while (retries > 0) {
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const systemPrompt = `Eres un experto en compras públicas de Chile, inteligencia de negocios y comercio electrónico.
Se te entregará el título, ítems y posiblemente el contenido de documentos PDF adjuntos de una licitación de "Compra Ágil".
Tu objetivo es analizar esta información y devolver un objeto JSON estructurado con la siguiente información:
1. "summary": Un resumen en lenguaje natural (máximo 2 oraciones) de lo que el comprador público realmente necesita.
2. "complexity": Nivel de complejidad logística o de suministro ("baja", "media", "alta"). Si requiere instalación, servicios adicionales o marcas muy específicas, es "alta".
3. "profitability": Una evaluación textual rápida de la rentabilidad esperada (ej. "Alta si se compra por mayor", "Media debido a alta competencia").
4. "keywords": Un arreglo de strings donde CADA STRING CORRESPONDE A LA BÚSQUEDA EXACTA DEL ÍTEM SOLICITADO. Debe haber exactamente la misma cantidad de keywords que la cantidad de ítems solicitados en la licitación. Si hay 3 ítems, el arreglo debe tener 3 strings de búsqueda.
   REGLA DE ORO PARA KEYWORDS: 
   - Si el texto menciona un MODELO EXACTO, MARCA ESPECÍFICA, CARACTERÍSTICA TÉCNICA CLAVE (ej. "2TB", "7200 RPM", "SATA") o MEDIDA EXACTA, debes usar EXACTAMENTE ese término como término de búsqueda para que el cotizador encuentre el producto preciso.
   - Omite palabras genéricas burocráticas (ej. "adquisición", "compra", "suministro").

Devuelve estrictamente un objeto JSON válido y nada más. Ejemplo de salida asumiendo que la licitación pide 2 ítems:
{
  "summary": "Se requieren 10 impresoras HP LaserJet M404dw con instalación y 5 tóners.",
  "complexity": "alta",
  "profitability": "Media, el margen dependerá del costo de instalación.",
  "keywords": ["HP LaserJet M404dw", "Tóner para LaserJet M404dw"]
}`;
            const contents = [
                { text: `${systemPrompt}\n\nTexto del requerimiento: "${text}"` }
            ];

            for (const pdf of pdfs) {
                contents.push({
                    inlineData: {
                        data: pdf.base64,
                        mimeType: "application/pdf"
                    }
                });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
            });

            let jsonText = response.text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.substring(7, jsonText.length - 3);
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.substring(3, jsonText.length - 3);
            }
            return JSON.parse(jsonText);
        } catch (e) {
            console.error(`Error analyzing text with Gemini (Retries left: ${retries - 1}):`, e.message);
            lastError = e;
            retries--;
            if (retries > 0) {
                // Wait for 2 seconds before retrying
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    console.error("Failed to analyze text after retries:", lastError);
    return {
        complexity: "media",
        keywords: [text.substring(0, 20)],
        summary: "Error al procesar con IA.",
        is_profitable: false
    };
}
