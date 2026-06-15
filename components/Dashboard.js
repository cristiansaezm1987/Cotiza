'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import Filters from './Filters';
import DataTable from './DataTable';
import RefreshButton from './RefreshButton';
import DetailModal from './DetailModal';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState({ current: 0, total: 0 });
  const [isSyncPaused, setIsSyncPaused] = useState(false);
  const isSyncPausedRef = useRef(false);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const [excelData, setExcelData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshingExcel, setIsRefreshingExcel] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    region: '',
    maxPrice: ''
  });

  const syncRef = useRef(false);

  useEffect(() => {
    isSyncPausedRef.current = isSyncPaused;
  }, [isSyncPaused]);

  const REGION_MAP = {
    "15": "Arica", "1": "Tarapacá", "2": "Antofagasta", "3": "Atacama", "4": "Coquimbo",
    "5": "Valparaíso", "13": "Metropolitana", "6": "O'Higgins", "7": "Maule", "16": "Ñuble",
    "8": "Biobío", "9": "Araucanía", "14": "Los Ríos", "10": "Los Lagos", "11": "Aysén", "12": "Magallanes"
  };

  const fetchAllRemainingPages = async (startPage, totalPages, accumulatedData) => {
    setIsBackgroundLoading(true);
    let currentData = [...accumulatedData];
    
    const BATCH_SIZE = 2; // Reducido a 2 para evitar ahogar el servidor (Timeouts)
    let p = startPage;
    
    while (p <= totalPages) {
      if (isSyncPausedRef.current) {
        // Pausar iteración verificando el semáforo cada 500ms sin perder progreso
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      
      try {
        const promises = [];
        for (let i = 0; i < BATCH_SIZE && (p + i) <= totalPages; i++) {
          const fetchWithRetry = async (pageNum) => {
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                const r = await fetch(`/api/scrape?page=${pageNum}`);
                const json = await r.json();
                if (json && json.success) return json;
                throw new Error('No data or success flag missing');
              } catch (e) {
                if (attempt === 3) return null;
                await new Promise(res => setTimeout(res, 2000 * attempt)); // Esperar antes de reintentar
              }
            }
            return null;
          };
          promises.push(fetchWithRetry(p + i));
        }
        
        const results = await Promise.all(promises);
        
        setBackgroundProgress({ current: Math.min(p + BATCH_SIZE - 1, totalPages), total: totalPages });
        
        let batchHasData = false;
        
        for (let result of results) {
          if (result && result.success && result.data) {
            currentData = [...currentData, ...result.data];
            batchHasData = true;
          }
        }
        
        if (batchHasData) setData(currentData);
        
      } catch (e) {
        console.error('Error in background batch fetching:', e);
      }
      
      p += BATCH_SIZE;
    }
    
    setIsBackgroundLoading(false);
  };

  const fetchData = async () => {
    if (filters.callNumber === '2' && excelData) return; // Disable API fetch only if we are querying Segundo Llamado and have excelData
    
    // Solo mostramos loader bloqueante si no tenemos data previa
    if (data.length === 0) setIsLoading(true);
    setError(null);
    try {
      // Siempre traemos la página 1 sin filtros para llenar la base local
      const res = await fetch(`/api/scrape?page=1`);
      const result = await res.json();
      
      if (!result.success) {
        setError(result.error || 'Error al conectar con el servidor.');
        setIsLoading(false);
        return;
      }

      const newData = result.data || [];
      const newTotal = result.totalCount || 0;
      
      setData(newData);
      setTotalCount(newTotal);

      // Si hay más páginas, iniciar descarga silenciosa
      const totalPages = Math.ceil(newTotal / 15);
      if (totalPages > 1) {
        fetchAllRemainingPages(2, totalPages, newData);
      }

    } catch (err) {
      setError('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Automated Excel Sync
  const syncExcelData = async () => {
    setIsRefreshingExcel(true);
    try {
      const res = await fetch('/api/excel');
      const result = await res.json();
      if (result.success && result.data) {
        setExcelData(result.data);
        setLastUpdate(new Date().toLocaleString('es-CL'));
      }
    } catch (err) {
      console.error('Error syncing Excel data:', err);
    } finally {
      setIsRefreshingExcel(false);
    }
  };

  const handleRefreshAll = () => {
    setPage(1);
    fetchData(1, filters);
    // Solo forzar recarga de Excel si ya estábamos en modo Segundo Llamado
    if (filters.callNumber === '2') {
      syncExcelData();
    }
  };

  useEffect(() => {
    if (data.length === 0 && !syncRef.current) {
      syncRef.current = true;
      fetchData();
      syncExcelData(); // Auto-start the Excel Bypass immediately on load
    }
  }, []);

  // Whenever filters change, reset page
  useEffect(() => {
    setPage(1);
    
    // Si eligen Segundo Llamado y NO tenemos la data de Excel, iniciar descarga
    if (filters.callNumber === '2' && !excelData) {
      syncExcelData();
    }
  }, [filters.search, filters.region, filters.status, filters.callNumber]);

  // Local filtering for both API mode and Excel mode
  useEffect(() => {
    // Definir la base de datos a filtrar
    let baseData = data;
    if (filters.callNumber === '2' && excelData && excelData.length > 0) {
      baseData = excelData;
    }

    let result = [...baseData];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(item => 
        (item.id && item.id.toLowerCase().includes(searchLower)) || 
        (item.name && item.name.toLowerCase().includes(searchLower))
      );
    }
    if (filters.status) {
      const statusMap = { '2': 'Publicada', '3': 'Cerrada', '4': 'Adjudicada', '5': 'Cancelada', '6': 'Desierta' };
      if (statusMap[filters.status]) {
        result = result.filter(item => item.statusName && item.statusName.toLowerCase().includes(statusMap[filters.status].toLowerCase()));
      }
    }
    if (filters.maxPrice) {
      result = result.filter(item => (item.price || item.monto_disponible_CLP || 0) <= Number(filters.maxPrice));
    }
    if (filters.region) {
      const rName = REGION_MAP[filters.region];
      if (rName) result = result.filter(item => item.region && item.region.toLowerCase().includes(rName.toLowerCase()));
    }
    
    // Solo filtramos si NO estamos en Segundo Llamado desde Excel (porque el Excel ya es Segundo Llamado)
    if (filters.callNumber) {
      if (!(filters.callNumber === '2' && excelData && excelData.length > 0)) {
        result = result.filter(item => item.callNumber === Number(filters.callNumber));
      }
    }
    
    setTotalCount(result.length);
    
    const itemsPerPage = 15;
    const startIndex = (page - 1) * itemsPerPage;
    const paginated = result.slice(startIndex, startIndex + itemsPerPage);
    
    setFilteredData(paginated);
  }, [data, excelData, filters, page]);

  const handleNextPage = () => {
      const nextPage = page + 1;
      setPage(nextPage);
  };

  const handlePrevPage = () => {
      if (page > 1) {
          const prevPage = page - 1;
          setPage(prevPage);
      }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <RefreshButton onRefresh={handleRefreshAll} isLoading={isLoading || isRefreshingExcel} />
          {lastUpdate && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Última actualización Excel: {lastUpdate}
            </span>
          )}
        </div>
        {error && <span style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</span>}
      </div>
      
      {isBackgroundLoading && (
        <div className="glass-panel animate-fade-in" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', background: isSyncPaused ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', border: `1px solid ${isSyncPaused ? '#f59e0b' : 'var(--accent-color)'}` }}>
          {!isSyncPaused && <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
          {isSyncPaused && <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pause size={18} color="#f59e0b" /></div>}
          
          <div style={{ flex: 1 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                 <span style={{ fontSize: '0.9rem', color: isSyncPaused ? '#f59e0b' : 'var(--accent-color)', fontWeight: 'bold' }}>
                    {isSyncPaused ? 'Sincronización Profunda Pausada' : 'Sincronización Profunda en Progreso...'}
                 </span>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Página {backgroundProgress.current} de {backgroundProgress.total} ({backgroundProgress.total > 0 ? Math.round((backgroundProgress.current / backgroundProgress.total) * 100) : 0}%)</span>
             </div>
             <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                 <div style={{ width: `${(backgroundProgress.current / backgroundProgress.total) * 100}%`, height: '100%', background: isSyncPaused ? '#f59e0b' : 'var(--accent-color)', transition: 'width 0.3s' }}></div>
             </div>
          </div>

          <button 
             onClick={() => setIsSyncPaused(!isSyncPaused)}
             style={{ 
                 background: isSyncPaused ? '#10b981' : 'rgba(255,255,255,0.1)', 
                 border: 'none', borderRadius: '50%', width: '36px', height: '36px', 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                 color: 'white', transition: '0.2s'
             }}
             title={isSyncPaused ? "Reanudar" : "Pausar"}
          >
             {isSyncPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
          </button>
        </div>
      )}

      {isRefreshingExcel && (
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', background: 'rgba(0, 198, 255, 0.1)', border: '1px solid var(--accent-color)' }}>
          <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>Bypass en progreso: Descargando datos ocultos...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>Esto puede tardar hasta 15 segundos debido a la encriptación de Mercado Público.</p>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div className="loading-bar-inner" style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, #00c6ff, var(--accent-color))', animation: 'progress 2s ease-in-out infinite' }}></div>
          </div>
        </div>
      )}

      <Filters filters={filters} setFilters={setFilters} />
      
      <DataTable 
         data={filteredData} 
         onRowClick={setSelectedItem} 
         isLoading={isLoading} 
         isRefreshingExcel={isRefreshingExcel}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                 {totalCount > 0 ? `Mostrando ${filteredData.length} resultados en esta página (Total en sistema: ${totalCount})` : 'No se encontraron resultados.'}
             </span>
             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <button 
                    onClick={handlePrevPage} 
                    disabled={page === 1 || isLoading}
                    style={{
                        padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', borderRadius: '8px', cursor: (page === 1 || isLoading) ? 'not-allowed' : 'pointer', opacity: (page === 1 || isLoading) ? 0.5 : 1
                    }}>
                     Anterior
                 </button>
                 <span style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--accent-color)', fontWeight: 'bold', minWidth: '100px', textAlign: 'center' }}>
                    Página {page}
                 </span>
                 <button 
                    onClick={handleNextPage} 
                    disabled={page * 15 >= totalCount}
                    style={{
                        padding: '8px 16px', background: 'var(--primary-color)', border: 'none',
                        color: 'white', borderRadius: '8px', cursor: (page * 15 >= totalCount) ? 'not-allowed' : 'pointer', opacity: (page * 15 >= totalCount) ? 0.5 : 1
                    }}>
                     Siguiente
                 </button>
             </div>
          </div>
      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
