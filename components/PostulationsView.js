import React, { useState, useEffect } from 'react';
import { Package, Truck, Percent, Calculator, FileText, Download, Trash2, ExternalLink, Copy } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function PostulationsView({ selectedTenders, onToggleSelection, onMarkBidded }) {
  const [drafts, setDrafts] = useState({});
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
    doc.autoTable({
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
    const finalY = doc.lastAutoTable.finalY || 120;
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
                <h4 style={{ margin: '8px 0 4px', fontSize: '1rem', lineHeight: '1.3' }}>{tender.name}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tender.organization}</p>
            </div>

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
