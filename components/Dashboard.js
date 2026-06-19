'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Zap, List, BookOpen, CheckCircle, Activity, Download } from 'lucide-react';
import Filters from './Filters';
import DataTable from './DataTable';
import RefreshButton from './RefreshButton';
import DetailModal from './DetailModal';
import RecommendationsPanel from './RecommendationsPanel';
import Top20View from './Top20View';
import MarketIntelligenceView from './MarketIntelligenceView';
import PostulationsView from './PostulationsView';
import SubmittedView from './SubmittedView';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('explorer');
  const [data, setData] = useState([]);
  const [selectedTenders, setSelectedTenders] = useState([]);

  const handleToggleSelection = (tender, isSelected) => {
      setSelectedTenders(prev => {
          if (isSelected) {
              if (!prev.some(t => t.id === tender.id)) return [...prev, tender];
              return prev;
          } else {
              return prev.filter(t => t.id !== tender.id);
          }
      });
      fetch('/api/postulations/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tender.id, isPostulated: isSelected })
      }).catch(console.error);
  };
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
      // Load initial postulations
      fetch('/api/postulations')
          .then(res => res.json())
          .then(data => {
             if (data.success && data.data) {
                 setSelectedTenders(data.data);
             }
          })
          .catch(console.error);
  }, []);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState({ current: 0, total: 0 });
  const [isSyncPaused, setIsSyncPaused] = useState(false);
  const isSyncPausedRef = useRef(false);
  const [error, setError] = useState(null);
  const [submittedBids, setSubmittedBids] = useState([]);
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const [lastUpdate, setLastUpdate] = useState(null);

  const [syncStatus, setSyncStatus] = useState({
    incremental: { active: false, progress: 0, message: '' },
    full: { active: false, progress: 0, message: '' },
    excel: { active: false, progress: 0, message: '' }
  });

  const [dbStats, setDbStats] = useState({ global: {}, base1: {}, base2: {} });

  useEffect(() => {
    let tick = 0;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/sync/status', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          setSyncStatus(prev => {
              // If sync just finished, trigger a fetch
              if (prev.full.active && !json.data.full.active) {
                  setTimeout(() => window.dispatchEvent(new Event('syncFinished')), 500);
              }
              if (prev.incremental.active && !json.data.incremental.active) {
                  setTimeout(() => window.dispatchEvent(new Event('syncFinished')), 500);
              }
              return json.data;
          });
        }
        
        // Fetch stats every 3 seconds to avoid spamming the DB too much, or 1s if we want. Let's do 3s.
        if (tick % 3 === 0) {
            const statsRes = await fetch('/api/stats', { cache: 'no-store' });
            const statsJson = await statsRes.json();
            if (statsJson.success) {
               setDbStats(statsJson.data);
            }
        }
        tick++;
      } catch (e) {}
    };
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to syncFinished event to auto-refresh data
  useEffect(() => {
      const handleSyncFinished = () => {
          setPage(1);
          // Only fetch DB data
          if (typeof window !== 'undefined') {
              // We'll define a global event listener later in the component.
          }
      };
      window.addEventListener('syncFinished', handleSyncFinished);
      return () => window.removeEventListener('syncFinished', handleSyncFinished);
  }, []);



  // Sync Automática cada 1 Hora
  useEffect(() => {
    const autoSyncInterval = setInterval(() => {
      fetch('/api/sync/incremental').catch(e => console.error('Auto sync error:', e));
    }, 60 * 60 * 1000); // 1 hora
    return () => clearInterval(autoSyncInterval);
  }, []);

  // Background Vetting State
  const [vettedData, setVettedData] = useState([]);
  const vettingQueueRef = useRef([]);
  const isVettingRef = useRef(false);
  const processedIdsRef = useRef(new Set());
  const [vettingProgress, setVettingProgress] = useState({ current: 0, total: 0 });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    region: '',
    maxPrice: ''
  });

  const syncRef = useRef(false);

  useEffect(() => {
    // Fetch submitted bids from Turso
    fetch('/api/submitted')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                setSubmittedBids(data.data);
            }
        })
        .catch(console.error);
  }, []);

  const handleMarkBidded = (tender, draft, calc) => {
      // Remove from selectedTenders (Postulations)
      setSelectedTenders(prev => prev.filter(t => t.id !== tender.id));
      
      const newBid = {
          ...tender,
          isBidded: 1,
          bidStatus: 'postulada',
          biddedDate: new Date().toLocaleString('es-CL'),
          biddedPrice: calc.total,
          biddedMargin: draft.margin || 0,
          postulationDraft: draft
      };
      
      setSubmittedBids(prev => [newBid, ...prev.filter(t => t.id !== tender.id)]);
      
      // Save to API
      fetch('/api/postulations/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              id: tender.id, 
              isBidded: true,
              bidStatus: 'postulada',
              biddedDate: newBid.biddedDate,
              biddedPrice: newBid.biddedPrice,
              biddedMargin: newBid.biddedMargin
          })
      }).catch(console.error);
  };

  const handleBidStatusChange = (tender, newStatus) => {
      setSubmittedBids(prev => prev.map(t => t.id === tender.id ? { ...t, bidStatus: newStatus } : t));
      
      fetch('/api/postulations/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              id: tender.id, 
              bidStatus: newStatus
          })
      }).catch(console.error);
  };

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
              const batch = vettingQueueRef.current.splice(0, 10);
              
              const promises = batch.map(async (candidate) => {
                  let finalScore = candidate.biScore;
                  let finalReasons = [...candidate.biReasons];
                  let descPreview = '';

                  try {
                      const res = await fetch(`/api/scrape-detail?id=${candidate.id}`);
                      const json = await res.json();
                      let passedDeepVetting = false;

                      if (json.success && json.data) {
                          const descLower = (json.data.descripcion || '').toLowerCase();
                          const COMPLEX_DESC = ['anexo', 'adjunto', 'archivo adjunto', 'ver archivo', 'ver anexo', 'ver detalle adjunto', 'según anexo', 'segun anexo', 'según especificaciones', 'bases adjuntas'];
                          if (descLower.length >= 20 && !COMPLEX_DESC.some(kw => descLower.includes(kw))) {
                              finalReasons.push('100% Simple (Sin Anexos)');
                              descPreview = json.data.descripcion;
                              passedDeepVetting = true;
                          }
                      }

                      if (!passedDeepVetting) {
                          finalScore = -1;
                      } else {
                          candidate.biReasons = finalReasons;
                          candidate.descriptionPreview = descPreview;
                          setVettedData(prev => {
                              if (prev.some(p => p.id === candidate.id)) return prev;
                              return [...prev, candidate].sort((a,b) => b.biScore - a.biScore);
                          });
                      }

                      await fetch('/api/vetting/save', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              id: candidate.id,
                              isVetted: 1,
                              biScore: finalScore,
                              biReasons: finalReasons,
                              descriptionPreview: descPreview
                          })
                      });
                  } catch (e) { console.error('Vetting Error', e); }
              });

              await Promise.all(promises);
              setVettingProgress(prev => ({ ...prev, current: prev.current + batch.length }));
          }
          isVettingRef.current = false;
      };
      
      const queueInterval = setInterval(processVettingQueue, 2000);
      return () => clearInterval(queueInterval);
  }, []);
  const fetchData = async () => {
    if (data.length === 0) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/data-all`);
      const result = await res.json();
      
      if (!result.success) {
        setError(result.error || 'Error al conectar con el servidor.');
        return;
      }
      
      const newData = result.data || [];
      const newTotal = result.totalCount || 0;
      
      setData(newData);
      setTotalCount(newTotal);
      
      const alreadyVetted = [];
      newData.forEach(item => {
          if (!processedIdsRef.current.has(item.id)) {
              processedIdsRef.current.add(item.id);
              
              if (item.isVetted === 1) {
                  if (item.biScore >= 0) {
                      item.biReasons = item.biReasons ? JSON.parse(item.biReasons) : [];
                      alreadyVetted.push(item);
                  }
              } else {
                  const scoredItem = calculateBiScore(item);
                  if (scoredItem.biScore >= 0) vettingQueueRef.current.push(scoredItem);
              }
          }
      });
      
      if (alreadyVetted.length > 0) {
          setVettedData(prev => {
              const newMap = new Map();
              prev.forEach(p => newMap.set(p.id, p));
              alreadyVetted.forEach(p => newMap.set(p.id, p));
              return Array.from(newMap.values()).sort((a,b) => b.biScore - a.biScore);
          });
      }
      
      vettingQueueRef.current.sort((a,b) => b.biScore - a.biScore);
      setVettingProgress({ current: 0, total: vettingQueueRef.current.length });
      
      // Auto-trigger vetting queue processor
      if (!isVettingRef.current && vettingQueueRef.current.length > 0) {
          // It will be picked up by the vetting useEffect
      }
      
    } catch (err) {
      setError(err.message || 'Error de red.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAll = () => {
    setPage(1);
    fetchData();
  };

  useEffect(() => {
      const handleSyncRefresh = () => {
          fetchData();
      };
      window.addEventListener('syncFinished', handleSyncRefresh);
      return () => window.removeEventListener('syncFinished', handleSyncRefresh);
  }, [fetchData]);

  useEffect(() => {
    if (!syncRef.current) {
        syncRef.current = true;
        fetchData();
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.region, filters.status, filters.callNumber]);

  useEffect(() => {
    const dataMap = new Map();
    
    data.forEach(item => {
        if (item && item.id) dataMap.set(item.id, item);
    });

    let result = Array.from(dataMap.values()).filter(item => !submittedBids.some(b => b.id === item.id));
    
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
  }, [data, filters, page, submittedBids]);

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
          <RefreshButton onRefresh={handleRefreshAll} isLoading={isLoading} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {error && <span style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</span>}
        </div>
      </div>
      
      {vettingProgress.total > 0 && vettingProgress.current < vettingProgress.total && (
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', padding: '15px', borderRadius: '12px', marginTop: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#a78bfa', fontWeight: 'bold' }}>
            <span>Analizando y puntuando licitaciones en segundo plano (Inteligencia)...</span>
            <span>{vettingProgress.current} / {vettingProgress.total} ({Math.round((vettingProgress.current / vettingProgress.total) * 100)}%)</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${(vettingProgress.current / vettingProgress.total) * 100}%`, 
              background: 'linear-gradient(90deg, #8b5cf6, #d946ef)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}
      
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
              onClick={() => setActiveTab('suggested-1')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'suggested-1' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'suggested-1' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <Zap size={18} /> Sugeridas (1er Llamado)
          </button>
          <button
              onClick={() => setActiveTab('suggested-2')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'suggested-2' ? '#d946ef' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'suggested-2' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <Activity size={18} /> Sugeridas (2do Llamado)
          </button>
          <button
              onClick={() => setActiveTab('historical')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'historical' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'historical' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <BookOpen size={18} /> Inteligencia Histórica
          </button>
          
          <button
              onClick={() => setActiveTab('postulations')}
              style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', transition: '0.2s',
                  background: activeTab === 'postulations' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'postulations' ? 'white' : 'var(--text-secondary)'
              }}
          >
              <CheckCircle size={18} /> Postulaciones ({selectedTenders.length})
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
      
      {/* Database Sync Controls */}
      <div className="glass-panel animate-fade-in" style={{ padding: '15px 20px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-color)' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div>
                 <h4 style={{ margin: '0 0 5px 0', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <Activity size={18} color="var(--accent-color)" /> Sincronización y Base de Datos
                 </h4>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                     Panel de control para descargas en segundo plano. No bloquean la pantalla.
                 </p>
             </div>
             
             <div style={{ display: 'flex', gap: '10px' }}>
                 <button 
                     onClick={async () => { fetch('/api/sync/incremental'); }}
                     disabled={syncStatus.incremental.active}
                     style={{ 
                         background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#3b82f6', 
                         padding: '6px 12px', borderRadius: '6px', cursor: syncStatus.incremental.active ? 'not-allowed' : 'pointer',
                         fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                     }}
                 >
                     <Zap size={14} /> Sync Rápida (1 hr)
                 </button>
                 
                 <button 
                     onClick={async () => {
                         if(!confirm('Esto descargará histórico. ¿Continuar?')) return;
                         fetch('/api/sync/full');
                     }}
                     disabled={syncStatus.full.active}
                     style={{ 
                         background: 'var(--accent-color)', border: 'none', color: 'white', 
                         padding: '6px 12px', borderRadius: '6px', cursor: syncStatus.full.active ? 'not-allowed' : 'pointer',
                         fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                     }}
                 >
                     <Download size={14} /> Sync Completa
                 </button>

                 <button 
                     onClick={async () => { fetch('/api/excel'); }}
                     style={{ 
                         background: '#10b981', border: 'none', color: 'white', 
                         padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                         fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                     }}
                 >
                     <List size={14} /> Descargar Excel
                 </button>
             </div>
         </div>

         {/* Progress Bars & Status Panel */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Sync Rápida / Principal */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#60a5fa', marginBottom: '4px', fontWeight: 'bold' }}>
                    <span>Estado: Base Local (SQLite)</span>
                    <span>{dbStats.base1?.totalCount !== undefined ? `${dbStats.base1.totalCount} licitaciones guardadas` : 'Consultando...'}</span>
                </div>
                {syncStatus.incremental.active || syncStatus.full.active ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>{syncStatus.full.active ? syncStatus.full.message : syncStatus.incremental.message}</span>
                            <span>{Math.round(syncStatus.full.active ? syncStatus.full.progress : syncStatus.incremental.progress)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: syncStatus.full.active ? 'var(--accent-color)' : '#3b82f6', width: `${syncStatus.full.active ? syncStatus.full.progress : syncStatus.incremental.progress}%`, transition: 'width 0.3s' }} />
                        </div>
                    </>
                ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Inactivo. Última sincronización registrada: {dbStats.base1?.lastSync ? new Date(dbStats.base1.lastSync).toLocaleString('es-CL') : 'Desconocida'}
                        {dbStats.base1?.oldestDate && ` | Historial: ${new Date(dbStats.base1.oldestDate).toLocaleDateString('es-CL')} ➔ ${new Date(dbStats.base1.newestDate).toLocaleDateString('es-CL')}`}
                    </div>
                )}
            </div>

            {/* Excel Status Bar */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#10b981', marginBottom: '4px', fontWeight: 'bold' }}>
                    <span>Estado: Base Excel (Segundos Llamados)</span>
                    <span>{dbStats.base2?.totalCount !== undefined ? `${dbStats.base2.totalCount} licitaciones en Nube (Turso)` : 'Guardado en Nube (Turso)'}</span>
                </div>
                {syncStatus.excel && syncStatus.excel.active ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>{syncStatus.excel.message}</span>
                            <span>{Math.round(syncStatus.excel.progress)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#10b981', width: `${syncStatus.excel.progress}%`, transition: 'width 0.3s' }} />
                        </div>
                    </>
                ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Presiona "Descargar Excel" en tu servidor local para actualizar los datos en la nube.
                        {dbStats.base2?.oldestDate && ` | Historial: ${new Date(dbStats.base2.oldestDate).toLocaleDateString('es-CL')} ➔ ${new Date(dbStats.base2.newestDate).toLocaleDateString('es-CL')}`}
                    </div>
                )}
            </div>
         </div>
      </div>
  


      {activeTab === 'historical' && (
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
                 isRefreshingExcel={syncStatus.excel.active}
                 selectedTenders={selectedTenders}
                 onToggleSelection={handleToggleSelection}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                     <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                         {totalCount > 0 ? `Mostrando ${filteredData.length} resultados en esta página (Total en sistema: ${totalCount})` : 'No se encontraron resultados.'}
                     </span>
                     <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                         <button 
                            onClick={() => setPage(1)} 
                            disabled={page === 1 || isLoading}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: (page === 1 || isLoading) ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)', cursor: (page === 1 || isLoading) ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}>
                             &laquo;
                         </button>
                         <button 
                            onClick={handlePrevPage} 
                            disabled={page === 1 || isLoading}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: (page === 1 || isLoading) ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)', cursor: (page === 1 || isLoading) ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}>
                             &lsaquo;
                         </button>
                         
                         {(() => {
                              const total = Math.max(1, Math.ceil(totalCount / 20));
                              let pages = [];
                              if (total <= 7) {
                                  pages = Array.from({ length: total }, (_, i) => i + 1);
                              } else if (page <= 4) {
                                  pages = [1, 2, 3, 4, 5, '...', total];
                              } else if (page >= total - 3) {
                                  pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
                              } else {
                                  pages = [1, '...', page - 1, page, page + 1, '...', total];
                              }
                              
                              return pages.map((p, idx) => (
                                  p === '...' ? (
                                      <span key={`ellipsis-${idx}`} style={{ color: 'var(--text-secondary)', padding: '0 5px' }}>...</span>
                                  ) : (
                                      <button
                                          key={p}
                                          onClick={() => setPage(p)}
                                          style={{
                                              padding: '6px 12px',
                                              background: p === page ? '#2563eb' : 'transparent',
                                              color: p === page ? 'white' : '#60a5fa',
                                              border: 'none',
                                              borderRadius: '6px',
                                              cursor: 'pointer',
                                              fontWeight: p === page ? 'bold' : 'normal',
                                              fontSize: '0.95rem'
                                          }}
                                      >
                                          {p}
                                      </button>
                                  )
                              ));
                         })()}

                         <button 
                            onClick={handleNextPage} 
                            disabled={page * 20 >= totalCount}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: (page * 20 >= totalCount) ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)', cursor: (page * 20 >= totalCount) ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}>
                             &rsaquo;
                         </button>
                         <button 
                            onClick={() => setPage(Math.max(1, Math.ceil(totalCount / 20)))} 
                            disabled={page * 20 >= totalCount}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: (page * 20 >= totalCount) ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)', cursor: (page * 20 >= totalCount) ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}>
                             &raquo;
                         </button>
                     </div>
              </div>
          </>
      )}

      {(activeTab === 'suggested-1' || activeTab === 'suggested-2') && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 250px' }}>
                 <Filters filters={filters} setFilters={setFilters} />
              </div>
              <Top20View 
                 data={vettedData.filter(item => {
                     if (submittedBids.some(b => b.id === item.id)) return false;
                     if (activeTab === 'suggested-1' && item.callNumber === 2) return false;
                     if (activeTab === 'suggested-2' && item.callNumber !== 2) return false;
                     return true;
                 })} 
                 filters={filters} 
                 selectedTenders={selectedTenders}
                 onToggleSelection={handleToggleSelection}
              />
          </div>
      )}
      
      {activeTab === 'postulations' && (
          <PostulationsView 
              selectedTenders={selectedTenders} 
              onToggleSelection={handleToggleSelection} 
              onMarkBidded={handleMarkBidded}
          />
      )}

      {activeTab === 'submitted' && (
          <SubmittedView 
              submittedBids={submittedBids} 
              onStatusChange={handleBidStatusChange} 
          />
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
