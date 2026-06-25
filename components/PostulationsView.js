import React, { useState, useEffect } from 'react';
import { Package, Truck, Percent, Calculator, FileText, Download, Trash2, ExternalLink, Copy, Search, ExternalLink as ExtLink, CheckCircle, Zap } from 'lucide-react';
import IntelligentWidget from './IntelligentWidget';

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
    // Si tenemos itemsData detallado desde el Motor Cotizador Inteligente
    if (draft.itemsData && draft.itemsData.length > 0) {
        let finalProduct = 0;
        draft.itemsData.forEach(item => {
            finalProduct += item.totalFinalPrice || 0;
        });
        
        const sCost = Number(draft.shippingCost) || 0;
        // El despacho usa un margen global genérico (30%) o el que tenga el draft
        const globalMargin = (Number(draft.margin) || 30) / 100;
        const finalShipping = Math.round(sCost * (1 + globalMargin));
        
        return { finalProduct, finalShipping, total: finalProduct + finalShipping };
    }
    
    // Fallback: Lógica antigua global
    const pCost = Number(draft.productCost) || 0;
    const sCost = Number(draft.shippingCost) || 0;
    const m = (Number(draft.margin) || 0) / 100;
    
    const finalProduct = Math.round(pCost * (1 + m));
    const finalShipping = Math.round(sCost * (1 + m));
    const total = finalProduct + finalShipping;

    return { finalProduct, finalShipping, total };
  };

  const generatePDF = () => {
      // Movido a lib/pdfGenerator.js
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
        <button 
          onClick={async () => {
            if (confirm('¿Estás seguro de que deseas borrar todas las postulaciones en curso?')) {
              for (const t of selectedTenders) {
                onToggleSelection(t, false);
                await new Promise(r => setTimeout(r, 100)); // Prevent SQLite DB lock
              }
            }
          }}
          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Trash2 size={16} /> Borrar Todo
        </button>
      </div>
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
                    onUpdateQuoter={(data) => {
                        updateDraft(tender.id, 'itemsData', data.itemsData);
                        updateDraft(tender.id, 'productCost', data.totalCost); // Solo para retrocompatibilidad
                    }} 
                />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                {!expandedQuoters[tender.id] && (
                    <>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                <Package size={14} /> Costo del Producto ($) (Global)
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
                                <Percent size={14} /> Margen Ganancia (Global)
                            </label>
                            <input 
                                type="number" 
                                value={draft.margin}
                                onChange={e => updateDraft(tender.id, 'margin', e.target.value)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                            />
                        </div>
                    </>
                )}

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
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <h6 style={{ color: 'white', margin: '0 0 10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📄 Datos Adicionales para PDF (Opcional)
                    </h6>
                </div>
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Destinatario / Cliente
                    </label>
                    <input 
                        type="text" 
                        value={draft.pdfClientName || ''}
                        onChange={e => updateDraft(tender.id, 'pdfClientName', e.target.value)}
                        placeholder="Ej. Jardin Betty"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        RUT Comprador
                    </label>
                    <input 
                        type="text" 
                        value={draft.pdfClientRut || ''}
                        onChange={e => updateDraft(tender.id, 'pdfClientRut', e.target.value)}
                        placeholder="Ej. 70.072.600-2"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Lugar de Entrega
                    </label>
                    <input 
                        type="text" 
                        value={draft.pdfDeliveryPlace || ''}
                        onChange={e => updateDraft(tender.id, 'pdfDeliveryPlace', e.target.value)}
                        placeholder="Ej. Población Sol de Septiembre N°1320"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Días de Entrega
                    </label>
                    <input 
                        type="number" 
                        value={draft.pdfDeliveryDays || ''}
                        onChange={e => updateDraft(tender.id, 'pdfDeliveryDays', e.target.value)}
                        placeholder="Ej. 3"
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
                onClick={() => {
                    if (onMarkBidded) onMarkBidded(tender, draft, calc);
                }}
                style={{ 
                    background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', 
                    fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', marginTop: 'auto', transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#059669'}
                onMouseOut={e => e.currentTarget.style.background = '#10b981'}
            >
                <CheckCircle size={18} /> Licitar
            </button>
          </div>
        );
      })}
    </div>
    </div>
  );
}
