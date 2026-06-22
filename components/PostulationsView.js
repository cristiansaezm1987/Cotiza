import React, { useState, useEffect } from 'react';
import { Package, Truck, Percent, Calculator, FileText, Download, Trash2, ExternalLink, Copy, Search, ExternalLink as ExtLink } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const IntelligentWidget = ({ tender, onUpdateQuoter }) => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [meliResultsMap, setMeliResultsMap] = useState({});
    const [selectedMap, setSelectedMap] = useState({});
    const [queries, setQueries] = useState({});
    const [isSearchingMeli, setIsSearchingMeli] = useState({});
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);


    
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
                try {
                    const aiRes = await fetch('/api/intelligence/extract-item-keywords', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenderName: tender.name, items: fetchedItems })
                    });
                    const aiData = await aiRes.json();
                    if (aiData.success && aiData.data) {
                        initialQueries = aiData.data;
                        queriesList = fetchedItems.map((_, idx) => initialQueries[idx] || fetchedItems[idx].nombre);
                    } else {
                        throw new Error("AI extraction failed");
                    }
                } catch (aiErr) {
                    console.error("Fallback to basic names", aiErr);
                    fetchedItems.forEach((i, idx) => {
                        initialQueries[idx] = i.nombre;
                        queriesList.push(i.nombre);
                    });
                }
                setIsAnalyzingAI(false);
                setQueries(initialQueries);
                
                const mlRes = await fetch(`/api/mercadolibre-bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ queries: queriesList })
                });
                const mlData = await mlRes.json();
                if (mlData.success) {
                    setMeliResultsMap(mlData.resultsMap);
                }
            } catch (e) {
                console.error("Error cargando widget:", e);
            }
            setLoading(false);
        }
        init();
    }, [tender.id]);

    const handleSelect = (idx, prod) => {
        const newSelected = { ...selectedMap, [idx]: prod };
        setSelectedMap(newSelected);
        
        let sum = 0;
        let links = [];
        items.forEach((_, i) => {
            if (newSelected[i]) {
                const qty = Number(items[i]?.cantidad) || 1;
                sum += newSelected[i].price * qty;
                links.push(newSelected[i].permalink);
            }
        });
        onUpdateQuoter(sum, links.join('\n'));
    };

    const handleManualSearch = async (idx) => {
        const query = queries[idx];
        if (!query) return;
        
        setIsSearchingMeli(prev => ({...prev, [idx]: true}));
        try {
            const res = await fetch(`/api/mercadolibre?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.success && data.results) {
                setMeliResultsMap(prev => ({...prev, [idx]: data.results}));
            } else {
                setMeliResultsMap(prev => ({...prev, [idx]: []}));
            }
        } catch (e) {
            console.error("Error buscando manualmente:", e);
        }
        setIsSearchingMeli(prev => ({...prev, [idx]: false}));
    };

    if (loading || isAnalyzingAI) return (
        <div style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '20px', marginTop: '10px', textAlign: 'center'}}>
            <div style={{width: '30px', height: '30px', border: '3px solid rgba(59, 130, 246, 0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px'}}></div>
            <p style={{color: '#60a5fa', margin: 0}}>{isAnalyzingAI ? '🤖 Analizando con IA (buscando productos exactos)...' : 'Recopilando datos de Licitación...'}</p>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid #3b82f6', borderRadius: '8px', padding: '15px', marginTop: '10px'}}>
            <h5 style={{margin: '0 0 15px 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px'}}><Calculator size={16}/> Sugerencias de Productos (Autollenado)</h5>
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
                                        <div style={{fontSize: '0.75rem', height: '2.8em', overflow: 'hidden', color: 'white', marginBottom: '5px', lineHeight: 1.2}}>{prod.title}</div>
                                        <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <span style={{color: '#10b981', fontWeight: 'bold'}}>${prod.price.toLocaleString('es-CL')}</span>
                                            {isSelected && <span style={{fontSize: '0.7rem', background: '#10b981', color: 'white', padding: '2px 4px', borderRadius: '3px'}}>Elegido</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
            {Object.keys(selectedMap).length === items.length && (
                <div style={{background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem'}}>
                    ¡Todos los ítems seleccionados! Costos y enlaces prellenados.
                </div>
            )}
        </div>
    );
};

export default function PostulationsView({ selectedTenders, onToggleSelection, onMarkBidded, onOpenDetail }) {
  const [drafts, setDrafts] = useState({});
  const [expandedQuoters, setExpandedQuoters] = useState({});
  const debounceRef = React.useRef({});

  // Initialize drafts for newly selected tenders
  useEffect(() => {
    const newDrafts = { ...drafts };
    selectedTenders.forEach(t => {
      if (!newDrafts[t.id]) {
        newDrafts[t.id] = t.postulationDraft && Object.keys(t.postulationDraft).length > 0 
          ? t.postulationDraft 
          : {
              productCost: '',
              supplierLink: '',
              shippingCost: '',
              margin: 30, // Default 30% margin
              validityDays: 30
            };
      }
    });
    setDrafts(newDrafts);
  }, [selectedTenders]);

  const updateDraft = (id, field, value) => {
    setDrafts(prev => {
      const newDraft = { ...prev[id], [field]: value };
      
      if (debounceRef.current[id]) clearTimeout(debounceRef.current[id]);
      debounceRef.current[id] = setTimeout(() => {
          fetch('/api/postulations/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, isPostulated: true, draft: newDraft })
          }).catch(console.error);
      }, 1000);

      return {
        ...prev,
        [id]: newDraft
      };
    });
  };

  const calculateFinal = (draft) => {
    const pCost = Number(draft.productCost) || 0;
    const sCost = Number(draft.shippingCost) || 0;
    const m = (Number(draft.margin) || 0) / 100;
    
    const finalProduct = Math.round(pCost * (1 + m));
    const finalShipping = Math.round(sCost * (1 + m));
    const total = finalProduct + finalShipping;

    return { finalProduct, finalShipping, total };
  };

  const generatePDF = (tender, draft, finalCalc) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text("COTIZACIÓN FORMAL", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const date = new Date().toLocaleDateString('es-CL');
    doc.text(`Fecha: ${date}`, 170, 30);
    
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + (Number(draft.validityDays) || 30));
    doc.text(`Válido hasta: ${validDate.toLocaleDateString('es-CL')}`, 170, 35);

    // Business Info Placeholder (Can be edited by user later)
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("De: Mi Empresa SpA", 14, 30);
    doc.text("RUT: 76.XXX.XXX-X", 14, 35);
    doc.text("Contacto: ventas@miempresa.cl", 14, 40);

    // Client Info
    doc.text(`Para: ${tender.organization || 'Mercado Público'}`, 14, 55);
    doc.text(`Licitación ID: ${tender.id}`, 14, 60);
    
    // Description
    doc.setFontSize(10);
    const splitTitle = doc.splitTextToSize(`Referencia: ${tender.name}`, 180);
    doc.text(splitTitle, 14, 70);

    // Table
    autoTable(doc, {
      startY: 85,
      headStyles: { fillColor: [41, 128, 185] },
      head: [['Descripción', 'Cantidad', 'Valor Unitario Neto', 'Subtotal Neto']],
      body: [
        ['Productos solicitados según bases', '1 Global', `$${finalCalc.finalProduct.toLocaleString('es-CL')}`, `$${finalCalc.finalProduct.toLocaleString('es-CL')}`],
        ['Servicio de Despacho', '1 Global', `$${finalCalc.finalShipping.toLocaleString('es-CL')}`, `$${finalCalc.finalShipping.toLocaleString('es-CL')}`]
      ],
      foot: [
        ['', '', 'TOTAL NETO:', `$${finalCalc.total.toLocaleString('es-CL')}`]
      ],
      footStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold' }
    });

    // Footer notes
    const finalY = doc.lastAutoTable?.finalY || 120;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Notas:", 14, finalY + 10);
    doc.text("- Los valores expresados son netos (no incluyen IVA).", 14, finalY + 15);
    doc.text("- Cumplimiento total de las especificaciones técnicas solicitadas en anexos.", 14, finalY + 20);

    doc.save(`Cotizacion_${tender.id}.pdf`);
  };

  if (selectedTenders.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Package size={48} style={{ opacity: 0.2, margin: '0 auto 15px' }} />
        <h3 style={{ margin: '0 0 10px', color: 'var(--text-primary)' }}>No hay postulaciones seleccionadas</h3>
        <p style={{ margin: 0 }}>Navega por el Explorador o las Sugerencias y marca la casilla de las licitaciones en las que deseas participar.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
      {selectedTenders.map(tender => {
        const draft = drafts[tender.id] || {};
        const calc = calculateFinal(draft);

        return (
          <div key={tender.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    <input 
                        type="checkbox" 
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                        onChange={(e) => {
                            if (e.target.checked && onMarkBidded) {
                                onMarkBidded(tender, draft, calc);
                            }
                        }}
                    /> Licitado
                </label>
                <button 
                    onClick={() => onToggleSelection(tender, false)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                    title="Quitar de postulaciones"
                >
                    <Trash2 size={18} />
                </button>
            </div>
            
            <div style={{ paddingRight: '120px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{tender.id}</span>
                    <button 
                        onClick={() => navigator.clipboard.writeText(tender.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                        title="Copiar ID"
                    >
                        <Copy size={14} />
                    </button>
                </div>
                <h4 
                    onClick={() => onOpenDetail && onOpenDetail(tender)}
                    style={{ margin: '8px 0 4px', fontSize: '1rem', lineHeight: '1.3', cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = '#60a5fa'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
                >
                    {tender.name}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tender.organization}</p>
                <button
                    onClick={() => setExpandedQuoters(prev => ({...prev, [tender.id]: !prev[tender.id]}))}
                    style={{
                        marginTop: '10px', background: expandedQuoters[tender.id] ? 'rgba(139, 92, 246, 0.2)' : 'linear-gradient(90deg, #8b5cf6, #d946ef)', color: expandedQuoters[tender.id] ? '#c4b5fd' : 'white',
                        border: expandedQuoters[tender.id] ? '1px solid #8b5cf6' : 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s'
                    }}
                >
                    <Calculator size={14} /> {expandedQuoters[tender.id] ? 'Cerrar Motor Cotizador' : '🤖 Usar Motor Cotizador Inteligente'}
                </button>
            </div>
            
            {expandedQuoters[tender.id] && (
                <IntelligentWidget 
                    tender={tender} 
                    onUpdateQuoter={(sumCost, urls) => {
                        updateDraft(tender.id, 'productCost', sumCost);
                        updateDraft(tender.id, 'supplierLink', urls);
                    }} 
                />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <Package size={14} /> Costo del Producto ($)
                    </label>
                    <input 
                        type="number" 
                        value={draft.productCost}
                        onChange={e => updateDraft(tender.id, 'productCost', e.target.value)}
                        placeholder="Ej. 50000"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <ExternalLink size={14} /> Enlace del Proveedor (Guardado Interno)
                    </label>
                    <input 
                        type="text" 
                        value={draft.supplierLink}
                        onChange={e => updateDraft(tender.id, 'supplierLink', e.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <Truck size={14} /> Costo Despacho
                    </label>
                    <input 
                        type="number" 
                        value={draft.shippingCost}
                        onChange={e => updateDraft(tender.id, 'shippingCost', e.target.value)}
                        placeholder="Ej. 5000"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <Percent size={14} /> Margen Ganancia
                    </label>
                    <input 
                        type="number" 
                        value={draft.margin}
                        onChange={e => updateDraft(tender.id, 'margin', e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                    />
                </div>
            </div>

            <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h5 style={{ margin: '0 0 10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={16} /> Valores Finales (Para M.Público)
                </h5>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Valor Unitario Neto:</span>
                    <strong>${calc.finalProduct.toLocaleString('es-CL')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Valor Despacho Neto:</span>
                    <strong>${calc.finalShipping.toLocaleString('es-CL')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span>Total Oferta:</span>
                    <strong style={{ color: '#10b981' }}>${calc.total.toLocaleString('es-CL')}</strong>
                </div>
            </div>

            <button 
                onClick={() => generatePDF(tender, draft, calc)}
                style={{ 
                    background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', 
                    fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', marginTop: 'auto', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
                onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
            >
                <Download size={18} /> Generar PDF Cotización
            </button>
          </div>
        );
      })}
    </div>
  );
}
