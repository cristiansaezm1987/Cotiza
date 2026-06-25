import React, { useState, useEffect } from 'react';
import { Search, Calculator, ExternalLink } from 'lucide-react';

export default function IntelligentWidget({ tender, onUpdateQuoter }) {
    const [items, setItems] = useState([]);
    const [queries, setQueries] = useState({});
    const [meliResultsMap, setMeliResultsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedMap, setSelectedMap] = useState({});
    const [customInputs, setCustomInputs] = useState({});
    const [margins, setMargins] = useState({});
    const [isSearchingMeli, setIsSearchingMeli] = useState({});
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [aiError, setAiError] = useState(null);

    // Initialize state from existing draft if present
    useEffect(() => {
        if (tender.postulationDraft && tender.postulationDraft.itemsData) {
            const initialCustomInputs = {};
            const initialMargins = {};
            tender.postulationDraft.itemsData.forEach(item => {
                initialCustomInputs[item.idx] = {
                    title: item.selectedTitle || '',
                    link: item.link || item.selectedTitle || '',
                    price: item.unitCost || ''
                };
                initialMargins[item.idx] = item.marginPct !== undefined ? item.marginPct : 30;
            });
            setCustomInputs(initialCustomInputs);
            setMargins(initialMargins);
        }
    }, [tender.id, tender.postulationDraft]);

    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                const res = await fetch(`/api/scrape-detail?id=${tender.id}`);
                const data = await res.json();
                let fetchedItems = data.data?.productos_solicitados || [];
                if (fetchedItems.length === 0) fetchedItems = [{nombre: data.data?.nombre || tender.name}];
                setItems(fetchedItems);
                
                setIsAnalyzingAI(true);
                let initialQueries = {};
                let queriesList = [];
                
                const cacheKey = `ai_keywords_v3_${tender.id}`;
                const cached = localStorage.getItem(cacheKey);
                
                try {
                    if (cached) {
                        initialQueries = JSON.parse(cached);
                        queriesList = fetchedItems.map((_, idx) => initialQueries[idx] || fetchedItems[idx].nombre);
                    } else {
                        const aiRes = await fetch('/api/intelligence/extract-item-keywords', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tenderName: tender.name, items: fetchedItems })
                        });
                        const aiData = await aiRes.json();
                        if (aiData.success && aiData.data) {
                            initialQueries = aiData.data;
                            queriesList = fetchedItems.map((_, idx) => initialQueries[idx] || fetchedItems[idx].nombre);
                            localStorage.setItem(cacheKey, JSON.stringify(initialQueries));
                        } else {
                            throw new Error("AI extraction failed");
                        }
                    }
                } catch (aiErr) {
                    console.error("Fallback to basic names", aiErr);
                    setAiError("Límite de IA alcanzado (Espera 1 min). Usando descripción/nombres originales.");
                    fetchedItems.forEach((i, idx) => {
                        let query = i.descripcion && i.descripcion.trim().length > 0 && i.descripcion.trim().length < 50 ? i.descripcion.trim() : i.nombre;
                        query = query.replace(/\n/g, ' ').replace(/\r/g, '').replace(/  +/g, ' ').trim();
                        initialQueries[idx] = query;
                        queriesList.push(query);
                    });
                }
                setIsAnalyzingAI(false);
                setQueries(initialQueries);
                
                // --- Backend Fetch (Django API) ---
                const smartSearch = async (originalQuery) => {
                    try {
                        const res = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(originalQuery)}`);
                        if (!res.ok) {
                            return [];
                        }
                        const data = await res.json();
                        
                        let rawResults = [];
                        if (data.results) rawResults = data.results; 
                        else if (data.meli_results) rawResults = data.meli_results;
                        
                        return rawResults.map((r, i) => ({
                            id: r.id || `item-${i}-${Date.now()}`,
                            title: r.title,
                            permalink: r.permalink,
                            price: r.price,
                            thumbnail: r.image || r.thumbnail
                        }));
                    } catch (e) {
                        return [];
                    }
                };

                const newMeliMap = {};
                for (let i = 0; i < queriesList.length; i++) {
                    newMeliMap[i] = await smartSearch(queriesList[i]);
                }
                setMeliResultsMap(newMeliMap);
            } catch (e) {
                console.error("Error cargando widget:", e);
            }
            setLoading(false);
        }
        init();
    }, [tender.id]);

    useEffect(() => {
        let totalCost = 0;
        let totalMargin = 0;
        let finalPrice = 0;
        let itemsData = [];
        
        items.forEach((item, idx) => {
            const qty = Number(item.cantidad) || 1;
            const custom = customInputs[idx] || {};
            const selected = selectedMap[idx];
            
            let cost = 0;
            let title = '';
            let link = '';
            
            if (custom.price && custom.price > 0) {
                cost = Number(custom.price);
                title = custom.title || 'Producto Manual';
                link = custom.link || '';
            } else if (selected) {
                cost = selected.price;
                title = selected.title;
                link = selected.permalink;
            }
            
            const marginPct = margins[idx] !== undefined ? margins[idx] : 30;
            const itemMarginVal = cost * (marginPct / 100);
            const itemFinal = cost + itemMarginVal;
            
            totalCost += (cost * qty);
            totalMargin += (itemMarginVal * qty);
            finalPrice += (itemFinal * qty);
            
            itemsData.push({
                idx,
                nombre: item.nombre,
                descripcion: item.descripcion,
                qty,
                selectedTitle: title,
                link,
                unitCost: cost,
                marginPct,
                unitMarginVal: itemMarginVal,
                unitFinalPrice: itemFinal,
                totalFinalPrice: itemFinal * qty
            });
        });
        
        if (onUpdateQuoter) {
            onUpdateQuoter({ totalCost, totalMargin, finalPrice, itemsData });
        }
    }, [items, selectedMap, customInputs, margins]);

    const handleSelect = (idx, prod) => {
        setSelectedMap(prev => ({ ...prev, [idx]: prod }));
        setCustomInputs(prev => ({ 
            ...prev, 
            [idx]: { title: prod.title, link: prod.permalink, price: prod.price } 
        }));
    };

    const handleManualSearch = async (idx) => {
        const query = queries[idx];
        if (!query) return;
        
        setIsSearchingMeli(prev => ({...prev, [idx]: true}));
        try {
            const res = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                let rawResults = [];
                if (data.results) rawResults = data.results;
                else if (data.meli_results) rawResults = data.meli_results;
                
                const newResults = rawResults.map((r, i) => ({
                    id: r.id || `item-${i}-${Date.now()}`,
                    title: r.title,
                    permalink: r.permalink,
                    price: r.price,
                    thumbnail: r.image || r.thumbnail
                }));
                setMeliResultsMap(prev => ({...prev, [idx]: newResults}));
            }
        } catch (e) {
            console.error("Error manual search", e);
        }
        setIsSearchingMeli(prev => ({...prev, [idx]: false}));
    };

    let renderTotalCost = 0;
    let renderTotalMargin = 0;
    let renderFinalPrice = 0;
    
    items.forEach((item, idx) => {
        const qty = Number(item.cantidad) || 1;
        const custom = customInputs[idx] || {};
        const selected = selectedMap[idx];
        let cost = 0;
        
        if (custom.price && custom.price > 0) {
            cost = Number(custom.price);
        } else if (selected) {
            cost = selected.price;
        }
        
        const marginPct = margins[idx] !== undefined ? margins[idx] : 30;
        const itemMarginVal = cost * (marginPct / 100);
        
        renderTotalCost += (cost * qty);
        renderTotalMargin += (itemMarginVal * qty);
        renderFinalPrice += ((cost + itemMarginVal) * qty);
    });

    if (loading || isAnalyzingAI) return (
        <div style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '20px', marginTop: '10px', textAlign: 'center'}}>
            <div style={{width: '30px', height: '30px', border: '3px solid rgba(59, 130, 246, 0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px'}}></div>
            <p style={{color: '#60a5fa', margin: 0}}>{isAnalyzingAI ? '🤖 Analizando con IA (buscando productos exactos)...' : 'Recopilando datos de Licitación...'}</p>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '15px', marginTop: '10px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <h5 style={{margin: 0, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px'}}><Calculator size={16}/> Sugerencias de Productos (Autollenado)</h5>
                {aiError && <span style={{fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ef4444'}}>{aiError}</span>}
            </div>
            {items.map((item, idx) => (
                <div key={idx} style={{marginBottom: '15px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
                        <div style={{flex: 1, paddingRight: '15px'}}>
                            <strong style={{color: 'white', fontSize: '0.9rem'}}>{item.nombre}</strong>
                            <div style={{color: '#9ca3af', fontSize: '0.8rem'}}>Cantidad requerida: {item.cantidad || 1} {item.unidad_medida || 'unidades'}</div>
                        </div>
                        <a href={`https://www.google.cl/search?q=${encodeURIComponent(item.nombre)}&tbm=shop`} target="_blank" rel="noreferrer" style={{background: 'white', color: '#ea4335', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>
                            <Search size={14}/> Google Chile
                        </a>
                    </div>
                    
                    <div style={{display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center'}}>
                        <input 
                            type="text" 
                            value={queries[idx] || ''} 
                            onChange={(e) => setQueries(prev => ({...prev, [idx]: e.target.value}))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch(idx); }}
                            placeholder="Buscar en MeliPulse..."
                            style={{flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.9rem'}}
                        />
                        <button 
                            onClick={() => handleManualSearch(idx)}
                            disabled={isSearchingMeli[idx]}
                            style={{background: '#3b82f6', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isSearchingMeli[idx] ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '5px'}}
                        >
                            {isSearchingMeli[idx] ? <div style={{width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div> : <Search size={14}/>}
                            Buscar
                        </button>
                    </div>
                    
                    {(!meliResultsMap[idx] || meliResultsMap[idx].length === 0) && !isSearchingMeli[idx] ? (
                        <p style={{color: '#f87171', fontSize: '0.85rem', margin: 0}}>MeliPulse no encontró resultados para "{queries[idx]}". Intenta modificar la búsqueda o usa Google.</p>
                    ) : (
                        <div style={{display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '5px'}} className="custom-scrollbar">
                            {meliResultsMap[idx].map(prod => {
                                const isSelected = selectedMap[idx]?.id === prod.id;
                                return (
                                    <div key={prod.id} onClick={() => handleSelect(idx, prod)} style={{minWidth: '140px', maxWidth: '140px', background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px', cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column'}}>
                                        <div style={{background: 'white', borderRadius: '4px', padding: '4px', marginBottom: '6px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <img src={prod.thumbnail} alt={prod.title} style={{maxHeight: '100%', maxWidth: '100%', objectFit: 'contain'}} />
                                        </div>
                                        <a 
                                            href={prod.permalink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            onClick={(e) => e.stopPropagation()} 
                                            style={{fontSize: '0.75rem', height: '2.8em', overflow: 'hidden', color: '#60a5fa', textDecoration: 'none', marginBottom: '5px', lineHeight: 1.2, display: 'flex', alignItems: 'flex-start', gap: '3px'}} 
                                            title="Ver en Mercado Libre"
                                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                        >
                                            {prod.title}
                                            <ExternalLink size={10} style={{minWidth: '10px', marginTop: '2px'}} />
                                        </a>
                                        <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <span style={{color: '#10b981', fontWeight: 'bold'}}>${prod.price.toLocaleString('es-CL')}</span>
                                            {isSelected && <span style={{fontSize: '0.7rem', background: '#10b981', color: 'white', padding: '2px 4px', borderRadius: '3px'}}>Elegido</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    <div style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                        <div style={{fontSize: '0.8rem', color: '#9ca3af', marginBottom: '5px'}}>Detalles de cotización para este ítem (editable):</div>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <input 
                                type="text" 
                                placeholder="Nombre/Link del Producto" 
                                value={customInputs[idx]?.link || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setCustomInputs(prev => ({...prev, [idx]: {...prev[idx], link: val, title: val}}));
                                    setSelectedMap(prev => { const n = {...prev}; delete n[idx]; return n; });
                                }}
                                style={{flex: 2, padding: '6px 10px', borderRadius: '4px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.8rem'}}
                            />
                            <input 
                                type="number" 
                                placeholder="Costo Unitario $" 
                                value={customInputs[idx]?.price || ''}
                                onChange={e => {
                                    setCustomInputs(prev => ({...prev, [idx]: {...prev[idx], price: e.target.value}}));
                                    setSelectedMap(prev => { const n = {...prev}; delete n[idx]; return n; });
                                }}
                                style={{flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.8rem'}}
                            />
                            <div style={{display: 'flex', alignItems: 'center', gap: '5px', flex: 1}}>
                                <label style={{fontSize: '0.8rem', color: 'white'}}>Margen %</label>
                                <input 
                                    type="number" 
                                    value={margins[idx] !== undefined ? margins[idx] : 30}
                                    onChange={e => setMargins(prev => ({...prev, [idx]: Number(e.target.value)}))}
                                    style={{width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.8rem'}}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            
            <div style={{background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '15px', marginTop: '15px', border: '1px solid #4b5563'}}>
                <h6 style={{color: 'white', margin: '0 0 10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px'}}><Calculator size={14}/> Resumen Motor Cotizador</h6>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px'}}>
                    <span>Costo Base Total:</span>
                    <span>${Math.round(renderTotalCost).toLocaleString('es-CL')}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#10b981', marginBottom: '8px'}}>
                    <span>Margen Total Esperado:</span>
                    <span>+ ${Math.round(renderTotalMargin).toLocaleString('es-CL')}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: 'white', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px'}}>
                    <span>Precio Final (Neto):</span>
                    <span>${Math.round(renderFinalPrice).toLocaleString('es-CL')}</span>
                </div>
            </div>

            {Object.keys(selectedMap).length === items.length && items.length > 0 && (
                <div style={{background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem'}}>
                    ¡Todos los ítems seleccionados! Costos y enlaces prellenados.
                </div>
            )}
        </div>
    );
}
