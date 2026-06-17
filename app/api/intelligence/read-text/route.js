import { NextResponse } from 'next/server';
import { analyzeTextRequirement } from '@/lib/intelligence';

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, pdfs } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Falta el texto a analizar' }, { status: 400 });
    }

    const analysis = await analyzeTextRequirement(text, pdfs || []);

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error("Error en API /read-text:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
