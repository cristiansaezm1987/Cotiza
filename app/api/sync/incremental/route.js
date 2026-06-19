import { NextResponse } from 'next/server';
import { openDB } from '../../../../lib/db';
import { updateStatus } from '@/lib/status';
import { getAuthHeaders } from '@/lib/auth';

export const maxDuration = 300; // 5 minutes max for full sync

export async function GET(request) {
  let browser;
  try {
    updateStatus('incremental', { active: true, progress: 0, message: 'Iniciando navegador...' });
    updateStatus('incremental', { active: true, progress: 0, message: 'Iniciando proceso...' });
    
    // Connect to DB
    const db = await openDB();

    const headersToSteal = await getAuthHeaders();

    let totalSaved = 0;
    let activeInserts = 0;

    // Loop through 50 pages to get the most recent data
    let pagesFetched = 1;
    const MAX_PAGES = 50;
    while (pagesFetched <= MAX_PAGES) {
      updateStatus('incremental', { 
        progress: 10 + (90 * (pagesFetched / MAX_PAGES)), 
        message: `Extrayendo página ${pagesFetched} de ${MAX_PAGES}...` 
      });
      
      try {
          const res = await fetch(`https://api.buscador.mercadopublico.cl/compra-agil?order_by=recent&status=2&page_number=${pagesFetched}`, {
              headers: headersToSteal
          });
          
          if (!res.ok) {
              console.error('Fetch error:', res.status);
              break;
          }
          
          const json = await res.json();
          if (!json || !json.payload || !json.payload.resultados || json.payload.resultados.length === 0) {
              break; // No more results
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
              console.log(`Saved ${data.length} items from API (Incremental). Total: ${totalSaved}`);
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

    updateStatus('incremental', { progress: 98, message: 'Realizando barrido de estados expirados...' });
    
    // Quick sweep: find items that are 'Publicada' but their closeDate has passed
    try {
        const activeTenders = await db.all(`SELECT id, closeDate FROM tenders WHERE statusName = 'Publicada' AND closeDate IS NOT NULL`);
        let expiredCount = 0;
        const nowMs = Date.now();
        
        for (const t of activeTenders) {
            const parts = t.closeDate.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
            if (parts) {
                const closeMs = new Date(`${parts[1]}-${parts[2]}-${parts[3]}T${parts[4]}:${parts[5]}:00-04:00`).getTime();
                if (nowMs > closeMs) {
                    await db.run(`UPDATE tenders SET statusName = 'Cerrada (Pendiente Actualización)' WHERE id = ?`, [t.id]);
                    expiredCount++;
                }
            }
        }
        console.log(`Quick sweep updated ${expiredCount} expired tenders.`);
    } catch (e) {
        console.error('Sweep error:', e);
    }

    // Wait for all background DB inserts to finish
    while (activeInserts > 0) {
      await new Promise(r => setTimeout(r, 500));
    }

    updateStatus('incremental', { active: false, progress: 100, message: 'Sincronización Rápida finalizada.' });
    return NextResponse.json({ success: true, message: `Sync incremental completada. ${totalSaved} licitaciones actualizadas o creadas.` });

  } catch (error) {
    console.error('Error during incremental sync:', error);
    updateStatus('incremental', { active: false, progress: 0, message: 'Error: ' + error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
