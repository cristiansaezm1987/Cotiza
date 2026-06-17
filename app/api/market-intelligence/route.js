import { NextResponse } from 'next/server';

const API_TICKET = 'E7F30A19-3FAB-4011-8FBF-154E135C490A';

function getFormattedDate(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}${m}${y}`;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const days = parseInt(searchParams.get('days') || '1', 10);

        if (!query) {
            return NextResponse.json({ success: false, error: 'Se requiere una palabra clave' }, { status: 400 });
        }

        const queryLower = query.toLowerCase();
        let matchedOrders = [];
        
        const today = new Date();
        
        // Fetch summaries for the requested days
        for (let i = 0; i < days; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - i);
            const dateStr = getFormattedDate(targetDate);
            
            try {
                const res = await fetch(`https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?fecha=${dateStr}&ticket=${API_TICKET}`);
                const data = await res.json();
                
                if (data && data.Listado) {
                    // Filter by keyword in the name
                    const dailyMatches = data.Listado.filter(o => o.Nombre && o.Nombre.toLowerCase().includes(queryLower));
                    matchedOrders = [...matchedOrders, ...dailyMatches];
                }
            } catch (err) {
                console.error(`Error fetching summary for date ${dateStr}:`, err);
            }
        }

        if (matchedOrders.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Limit to top 20 to avoid extreme rate limits and timeout
        matchedOrders = matchedOrders.slice(0, 20);
        
        const detailedResults = [];

        // Fetch details concurrently with a small batch limit to respect APIs
        const fetchDetail = async (orderSummary) => {
            try {
                const res = await fetch(`https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?codigo=${orderSummary.Codigo}&ticket=${API_TICKET}`);
                const detailData = await res.json();
                
                if (detailData && detailData.Listado && detailData.Listado.length > 0) {
                    const order = detailData.Listado[0];
                    
                    // Filter items inside the order that match the query
                    let items = [];
                    if (order.Items && order.Items.Listado) {
                        items = order.Items.Listado
                            .filter(i => 
                                (i.Producto && i.Producto.toLowerCase().includes(queryLower)) || 
                                (i.EspecificacionProveedor && i.EspecificacionProveedor.toLowerCase().includes(queryLower)) ||
                                (i.EspecificacionComprador && i.EspecificacionComprador.toLowerCase().includes(queryLower))
                            )
                            .map(i => ({
                                cantidad: i.Cantidad,
                                precioNeto: i.PrecioNeto,
                                especificacion: i.EspecificacionProveedor || i.EspecificacionComprador || i.Producto
                            }));
                    }
                    
                    // If no specific item matched the word, but the order title did, we add all items
                    // because it might be a general title like "COMPRA DE COMPUTADOR" and item is "HP PAVILION"
                    if (items.length === 0 && order.Items && order.Items.Listado) {
                         items = order.Items.Listado.map(i => ({
                             cantidad: i.Cantidad,
                             precioNeto: i.PrecioNeto,
                             especificacion: i.EspecificacionProveedor || i.EspecificacionComprador || i.Producto
                         }));
                    }
                    
                    return {
                        codigo: order.Codigo,
                        fecha: order.Fechas?.FechaAceptacion ? new Date(order.Fechas.FechaAceptacion).toLocaleDateString('es-CL') : 'N/A',
                        comprador: order.Comprador?.NombreOrganismo || 'Desconocido',
                        items: items
                    };
                }
            } catch (e) {
                console.error(`Error fetching detail for ${orderSummary.Codigo}:`, e);
            }
            return null;
        };

        const detailsPromises = matchedOrders.map(fetchDetail);
        const resolvedDetails = await Promise.all(detailsPromises);
        
        const finalData = resolvedDetails.filter(d => d !== null && d.items && d.items.length > 0);
        
        return NextResponse.json({ success: true, data: finalData });

    } catch (error) {
        console.error("Market Intelligence API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
