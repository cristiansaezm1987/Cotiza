import { NextResponse } from 'next/server';
import { getAuthHeaders } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('id');

    if (!code) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const headersToSteal = await getAuthHeaders();
    
    // Fetch the detailed description
    const res = await fetch(`https://api.buscador.mercadopublico.cl/compra-agil?action=ficha&code=${code}`, {
        headers: headersToSteal
    });
    
    if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
    }
    
    const json = await res.json();
    
    if (json && json.payload) {
      // Return the payload without adjuntos (we don't strictly need them for the business rules)
      json.payload.adjuntos = [];
      return NextResponse.json({ success: true, data: json.payload });
    } else {
      return NextResponse.json({ success: false, error: 'No se encontraron detalles para este código.' }, { status: 404 });
    }

  } catch (error) {
    console.error("Detail Scrape error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
