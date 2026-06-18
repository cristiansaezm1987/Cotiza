import { NextResponse } from 'next/server';
import { openDB } from '../../../../lib/db';
import { updateStatus } from '@/lib/status';
import { getAuthHeaders } from '@/lib/auth';

export const maxDuration = 300; // 5 minutes max for full sync

export async function GET(request) {
  // Fire and forget background task
  runFullSync().catch(console.error);
  return NextResponse.json({ success: true, message: 'Sincronización histórica iniciada en segundo plano.' });
}

async function runFullSync() {
  let browser;
  try {
    updateStatus('full', { active: true, progress: 0, message: 'Iniciando navegador...' });
    
    const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
    
    // Connect to DB
    const db = await openDB();

    const headersToSteal = await getAuthHeaders();

    let totalSaved = 0;
    let activeInserts = 0;

    // Iterate backwards by 5-day chunks up to 30 days
    const daysBack = 30;
    const chunkSize = 5;
    const now = new Date();
    
    for (let i = 0; i < daysBack; i += chunkSize) {
        const dTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i - chunkSize + 1);
        
        const dateTo = dTo.toISOString().split('T')[0];
        const dateFrom = dFrom.toISOString().split('T')[0];
        
        updateStatus('full', { progress: 5 + ((i/daysBack) * 90), message: `Buscando histórico: ${dateFrom} a ${dateTo}...` });
        
        let pagesFetched = 1;
        const MAX_PAGES = 100; // max pages per chunk
        while (pagesFetched <= MAX_PAGES) {
          updateStatus('full', { 
            progress: 5 + ((i/daysBack) * 90) + (90 * (pagesFetched / MAX_PAGES) / (daysBack/chunkSize)), 
            message: `Extrayendo bloque ${i/chunkSize + 1}/${daysBack/chunkSize}: página ${pagesFetched}...` 
          });
          
          try {
              const res = await fetch(`https://api.buscador.mercadopublico.cl/compra-agil?date_from=${dateFrom}&date_to=${dateTo}&order_by=recent&page_number=${pagesFetched}`, {
                  headers: headersToSteal
              });
              
              if (!res.ok) {
                  console.error('Fetch error:', res.status);
                  break;
              }
              
              const json = await res.json();
              if (!json || !json.payload || !json.payload.resultados || json.payload.resultados.length === 0) {
                  break; // No more results for this chunk
              }
              
              const data = json.payload.resultados;
              activeInserts++;
              try {
                  for (const item of data) {
                      const price = Number(item.monto_disponible_CLP) || Number(item.monto_estimado) || 0;
                      await db.run(`
                        INSERT INTO tenders (
                          id, name, status, statusName, date, price, organization, region, closeDate, deliveryDays, callNumber, lastUpdated
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                          status = excluded.status,
                          statusName = excluded.statusName,
                          closeDate = excluded.closeDate,
                          lastUpdated = excluded.lastUpdated
                      `, [
                        item.codigo,
                        item.nombre,
                        String(item.id_estado),
                        item.estado || 'Desconocido',
                        item.fecha_publicacion,
                        price,
                        item.organismo,
                        item.region || item.unidad || 'N/A',
                        item.fecha_cierre || null,
                        item.dias_entrega || 'Ver detalle',
                        item.estado_convocatoria === 2 ? 2 : 1,
                        new Date().toISOString()
                      ]);
                  }
                  totalSaved += data.length;
                  console.log(`Saved ${data.length} items from API. Total: ${totalSaved}`);
              } finally {
                  activeInserts--;
              }
              
              // If it returned less than 15, it's the last page
              if (data.length < 15) {
                  break;
              }
              
              pagesFetched++;
              // small delay to be polite
              await new Promise(r => setTimeout(r, 200));
          } catch (e) {
              console.error('Error fetching API page:', e);
              break;
          }
        }
    }

    // Wait for all background DB inserts to finish
    while (activeInserts > 0) {
      await new Promise(r => setTimeout(r, 500));
    }

    updateStatus('full', { active: false, progress: 100, message: 'Sincronización Histórica finalizada.' });
    console.log(`Sync completada. ${totalSaved} licitaciones actualizadas o creadas.`);

  } catch (error) {
    console.error('Error during full sync:', error);
    updateStatus('full', { active: false, progress: 0, message: 'Error: ' + error.message });
  }
}
