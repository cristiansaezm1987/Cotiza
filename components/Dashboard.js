'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Zap, List, BookOpen, CheckCircle } from 'lucide-react';
import Filters from './Filters';
import DataTable from './DataTable';
import RefreshButton from './RefreshButton';
import DetailModal from './DetailModal';
import RecommendationsPanel from './RecommendationsPanel';
import Top20View from './Top20View';
import MarketIntelligenceView from './MarketIntelligenceView';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('explorer');
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState({ current: 0, total: 0 });
  const [isSyncPaused, setIsSyncPaused] = useState(false);
  const isSyncPausedRef = useRef(false);
  const [error, setError] = useState(null);
  const [submittedBids, setSubmittedBids] = useState({});
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const [excelData, setExcelData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshingExcel, setIsRefreshingExcel] = useState(false);

  // Background Vetting State
  const [vettedData, setVettedData] = useState([]);
  const vettingQueueRef = useRef([]);
  const isVettingRef = useRef(false);
  const processedIdsRef = useRef(new Set());

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    region: '',
    maxPrice: ''
  });

  const syncRef = useRef(false);

  useEffect(() => {
    try {
        const saved = localStorage.getItem('comprasAgilesSubmittedBids');
        if (saved) {
            setSubmittedBids(JSON.parse(saved));
        }
    } catch (e) { console.error('Error loading submitted bids', e); }
  }, []);

  useEffect(() => {
      try {
          localStorage.setItem('comprasAgilesSubmittedBids', JSON.stringify(submittedBids));
      } catch (e) { console.error('Error saving submitted bids', e); }
  }, [submittedBids]);

  useEffect(() => {
    isSyncPausedRef.current = isSyncPaused;
  }, [isSyncPaused]);

  const REGION_MAP = {
    "15": "Arica", "1": "Tarapacá", "2": "Antofagasta", "3": "Atacama", "4": "Coquimbo",
    "5": "Valparaíso", "13": "Metropolitana", "6": "O'Higgins", "7": "Maule", "16": "Ñuble",
    "8": "Biobío", "9": "Araucanía", "14": "Los Ríos", "10": "Los Lagos", "11": "Aysén", "12": "Magallanes"
  };

  const calculateBiScore = (item) => {
      let score = 0;
      let reasons = [];
      const titleLower = (item.name || '').toLowerCase();
      const complexKeywords = ['anexo', 'adjunto', 'bases', 'archivo', 'segun detalle', 'según detalle', 'ver especificacion', 'según especificaciones', 'segun especificaciones', 's/anexo', 'según correo'];
      if (complexKeywords.some(kw => titleLower.includes(kw))) score -= 2000;
      if (item.callNumber === 2) { score += 50; reasons.push('2do Llamado (+50)'); }
      const isPublicada = item.statusName?.toLowerCase()?.includes('publicada');
      if (!isPublicada) score -= 1000;
      const price = Number(item.price || item.monto_disponible_CLP || 0);
      if (price >= 100000 && price <= 1500000) { score += 20; reasons.push('Presupuesto Óptimo (+20)'); }
      else if (price > 1500000) { score += 10; reasons.push('Alto Presupuesto (+10)'); }
      else if (price > 0 && price < 50000) { score -= 10; reasons.push('Bajo Presupuesto (-10)'); }
      const techKeywords = ['software', 'licencia', 'computador', 'notebook', 'servidor', 'tecnología', 'impresora', 'toner'];
      if (techKeywords.some(kw => titleLower.includes(kw))) { score += 15; reasons.push('Sector Rentable (+15)'); }
      let dDays = 0;
      if (typeof item.deliveryDays === 'number') dDays = item.deliveryDays;
      else if (item.deliveryDays && item.deliveryDays.toString() !== 'Ver detalle') {
          const match = item.deliveryDays.toString().match(/\d+/);
          if (match) dDays = parseInt(match[0]);
      }
      if (dDays > 5) { score += 15; reasons.push('Plazo Holgado (+15)'); }
      else if (dDays > 0 && dDays <= 2) { score -= 10; reasons.push('Plazo Corto (-10)'); }
      
      return { ...item, biScore: score, biReasons: reasons };
  };

  useEffect(() => {
      const processVettingQueue = async () => {
          if (isVettingRef.current || vettingQueueRef.current.length === 0) return;
          isVettingRef.current = true;
          
          while (vettingQueueRef.current.length > 0) {
              const candidate = vettingQueueRef.current.shift();
              try {
                  const res = await fetch(`/api/scrape-detail?id=${candidate.id}`);
                  const json = await res.json();
                  if (json.success && json.data) {
                      const descLower = (json.data.descripcion || '').toLowerCase();
                      const COMPLEX_DESC = ['anexo', 'adjunto', 'archivo adjunto', 'ver archivo', 'ver anexo', 'ver detalle adjunto', 'según anexo', 'segun anexo', 'según especificaciones', 'bases adjuntas'];
                      if (descLower.length >= 20 && !COMPLEX_DESC.some(kw => descLower.includes(kw))) {
                          candidate.biReasons.push('100% Simple (Sin Anexos)');
                          candidate.descriptionPreview = json.data.descripcion;
                          setVettedData(prev => {
                              if (prev.some(p => p.id === candidate.id)) return prev;
                              return [...prev, candidate].sort((a,b) => b.biScore - a.biScore);
                          });
                      }
                  }
              } catch (e) { console.error('Vetting Error', e); }
          }
          isVettingRef.current = false;
      };
      
      const interval = setInterval(processVettingQueue, 2000);
      return () => clearInterval(interval);
  }, []);

  const fetchAllRemainingPages = async (startPage, totalPages, accumulatedData) => {
    setIsBackgroundLoading(true);
    let currentData = [...accumulatedData];
    
    const BATCH_SIZE = 2;
    let p = startPage;
    
    while (p <= totalPages) {
      if (isSyncPausedRef.current) {
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
                await new Promise(res => setTimeout(res, 2000 * attempt));
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
            
            result.data.forEach(item => {
                if (processedIdsRef.current.has(item.id)) return;
                processedIdsRef.current.add(item.id);
                const scoredItem = calculateBiScore(item);
                if (scoredItem.biScore >= 0) {
                    vettingQueueRef.current.push(scoredItem);
                }
            });
            vettingQueueRef.current.sort((a,b) => b.biScore - a.biScore);
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
    if (filters.callNumber === '2' && excelData) return;
    
    if (data.length === 0) setIsLoading(true);
    setError(null);
    try {
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
      
      newData.forEach(item => {
          if (!processedIdsRef.current.has(item.id)) {
              processedIdsRef.current.add(item.id);
              const scoredItem = calculateBiScore(item);
              if (scoredItem.biScore >= 0) vettingQueueRef.current.push(scoredItem);
          }
      });
      vettingQueueRef.current.sort((a,b) => b.biScore - a.biScore);

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
    fetchData();
    if (filters.callNumber === '2') {
      syncExcelData();
    }
  };

  useEffect(() => {
    if (!syncRef.current) {
        syncRef.current = true;
        fetchData();
        syncExcelData();
    }
  }, []);

  useEffect(() => {
    setPage(1);
    if (filters.callNumber === '2' && !excelData) {
      syncExcelData();
    }
  }, [filters.search, filters.region, filters.status, filters.callNumber]);

  useEffect(() => {
    const dataMap = new Map();
    
    data.forEach(item => {
        if (item && item.id) dataMap.set(item.id, item);
    });
    
    if (excelData && Array.isArray(excelData)) {
        excelData.forEach(item => {
            if (item && item.id) {
                if (dataMap.has(item.id)) {
                    dataMap.set(item.id, { ...dataMap.get(item.id), ...item, _rawExcel: false });
                } else {
                    dataMap.set(item.id, item);
                }
            }
        });
    }

    let result = Array.from(dataMap.values()).filter(item => !submittedBids[item.id]);
    
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
    
    if (filters.callNumber) {
      result = result.filter(item => item.callNumber === Number(filters.callNumber));
    }
    
    setTotalCount(result.length);
    
    const itemsPerPage = 15;
    const startIndex = (page - 1) * itemsPerPage;
    const paginated = result.slice(startIndex, startIndex + itemsPerPage);
    
    setFilteredData(paginated);
  }, [data, excelData, filters, page, submittedBids]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {error && <span style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</span>}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button
              onClick={() => setActiveTab('explorer')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'explorer' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'explorer' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <List size={18} /> Explorador General
          </button>
          <button
              onClick={() => setActiveTab('suggested')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'suggested' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'suggested' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <Zap size={18} /> Licitaciones Sugeridas
          </button>
          <button
              onClick={() => setActiveTab('intelligence')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'intelligence' ? '#10b981' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'intelligence' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <BookOpen size={18} /> Inteligencia Histórica
          </button>
          <button
              onClick={() => setActiveTab('submitted')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'submitted' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'submitted' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <CheckCircle size={18} /> Licitaciones Postuladas
          </button>
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

      {activeTab === 'intelligence' && (
          <MarketIntelligenceView />
      )}

      {activeTab === 'explorer' && (
          <>
              <Filters filters={filters} setFilters={setFilters} />
              <RecommendationsPanel budget={Number(filters.maxPrice) || 0} region={filters.region} />
              
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
          </>
      )}

      {activeTab === 'suggested' && (
          <>
              <div style={{ marginBottom: '15px' }}>
                 <Filters filters={filters} setFilters={setFilters} />
              </div>
              <Top20View 
                 data={vettedData.filter(item => !submittedBids[item.id])} 
                 filters={filters} 
              />
          </>
      )}

      {activeTab === 'submitted' && (
          <div className="glass-panel" style={{ padding: '25px', animation: 'fadeIn 0.5s ease-in-out' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', margin: '0 0 20px 0' }}>
                  <CheckCircle size={28} />
                  Licitaciones Postuladas
              </h2>
              {Object.keys(submittedBids).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No tienes licitaciones marcadas como postuladas todavía.
                  </div>
              ) : (
                  <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                  <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>ID Licitación</th>
                                  <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Título</th>
                                  <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Fecha Postulación</th>
                                  <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Precio PDF</th>
                                  <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Acción</th>
                              </tr>
                          </thead>
                          <tbody>
                              {Object.values(submittedBids).map((bid) => (
                                  <tr key={bid.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                      <td style={{ padding: '15px 10px', color: '#60a5fa' }}>{bid.id}</td>
                                      <td style={{ padding: '15px 10px', color: 'white' }}>{bid.name}</td>
                                      <td style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>{bid.submittedAt}</td>
                                      <td style={{ padding: '15px 10px', color: '#10b981', fontWeight: 'bold' }}>{bid.quotedPrice}</td>
                                      <td style={{ padding: '15px 10px' }}>
                                          <button 
                                              onClick={() => {
                                                  const newBids = {...submittedBids};
                                                  delete newBids[bid.id];
                                                  setSubmittedBids(newBids);
                                              }}
                                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}
                                          >
                                              Eliminar
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      )}
      
      {selectedItem && (
        <DetailModal 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
            onMarkSubmitted={(quoteInfo) => {
                setSubmittedBids(prev => ({
                    ...prev,
                    [selectedItem.id]: {
                        id: selectedItem.id,
                        name: selectedItem.name,
                        submittedAt: new Date().toLocaleString('es-CL'),
                        quotedPrice: quoteInfo?.price || 'N/A'
                    }
                }));
                setSelectedItem(null);
            }}
        />
      )}
    </div>
  );
}
