import React, { useState } from 'react';
import { Bot, ShoppingCart, Calculator, Download, CheckCircle, Activity, X } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function SmartQuoter({ item, details, aiKeywords, onMarkSubmitted }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mlResultsMap, setMlResultsMap] = useState({});
  const [selectedMap, setSelectedMap] = useState({});
  const [manualInputs, setManualInputs] = useState({});
  const [meliPulseModal, setMeliPulseModal] = useState({ isOpen: false, itemIndex: null, query: '', results: [], isSearching: false });
  const [error, setError] = useState(null);

  const items = details?.productos_solicitados || [item];
  const allItemsHaveResults = items.every((_, i) => mlResultsMap[i] && mlResultsMap[i].length >= 0);
  const allItemsSelected = items.every((_, i) => selectedMap[i]);

  const handleAnalyze = async (keywordsToUse = aiKeywords) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const queries = items.map((item, i) => keywordsToUse?.[i] || item.nombre);
      const res = await fetch(`/api/mercadolibre-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries })
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}

      let newResultsMap = {};
      if (res.ok && data.success && data.resultsMap) {
          newResultsMap = data.resultsMap;
      } else {
          items.forEach((_, i) => newResultsMap[i] = []);
      }
      setMlResultsMap(newResultsMap);
    } catch (e) {
      setError('Error al consultar Mercado Libre: ' + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
      if (aiKeywords && aiKeywords.length > 0 && Object.keys(mlResultsMap).length === 0 && !isAnalyzing) {
          handleAnalyze(aiKeywords);
      }
  }, [aiKeywords]);

  const selectProduct = (index, prod) => {
      setSelectedMap(prev => ({ ...prev, [index]: prod }));
      if (!manualInputs[index]) {
          setManualInputs(prev => ({ ...prev, [index]: { shipping: 0, margin: 30 } }));
      }
  };

  const handleManualInputChange = (index, field, value) => {
      setManualInputs(prev => ({
          ...prev,
          [index]: { ...prev[index], [field]: Number(value) }
      }));
  };

  const executeMeliPulseSearch = async (query) => {
      if (!query) return;
      setMeliPulseModal(prev => ({ ...prev, query, isSearching: true }));
      try {
          const res = await fetch(`/api/mercadolibre?q=${encodeURIComponent(query)}`);
          let data = {};
          try { data = await res.json(); } catch (e) {}

          if (res.ok && data.success && data.results) {
              setMeliPulseModal(prev => ({ ...prev, results: data.results, isSearching: false }));
          } else {
              setMeliPulseModal(prev => ({ ...prev, results: [], isSearching: false }));
          }
      } catch (e) {
          setMeliPulseModal(prev => ({ ...prev, results: [], isSearching: false }));
      }
  };

  const openMeliPulseModal = (index) => {
      const initialQuery = (aiKeywords && aiKeywords[index]) ? aiKeywords[index] : items[index].nombre;
      setMeliPulseModal({ isOpen: true, itemIndex: index, query: initialQuery, results: [], isSearching: true });
      executeMeliPulseSearch(initialQuery);
  };

  const closeMeliPulseModal = () => {
      setMeliPulseModal({ isOpen: false, itemIndex: null, query: '', results: [], isSearching: false });
  };

  const selectProductFromModal = (prod) => {
      const idx = meliPulseModal.itemIndex;
      selectProduct(idx, prod);
      if (meliPulseModal.results.length > 0) {
          setMlResultsMap(prev => ({ ...prev, [idx]: meliPulseModal.results }));
      }
      closeMeliPulseModal();
  };

  const calculateItemFinalPrice = (index) => {
      const prod = selectedMap[index];
      if (!prod) return 0;
      const shipping = manualInputs[index]?.shipping || 0;
      const margin = manualInputs[index]?.margin || 0;
      return Math.round((prod.price + shipping) * (1 + margin / 100));
  };

  const downloadPDF = () => {
      if (!allItemsSelected) return;
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(59, 130, 246);
      doc.text("COTIZACIÓN FORMAL", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 20, 35);
      doc.text(`Ref Licitación / Compra Ágil: ${details.codigo}`, 20, 42);
      doc.text(`Comprador: ${details.comprador?.nombre_organismo || details.informacion_institucion?.organismo_comprador || 'Institución Pública'}`, 20, 49);

      doc.setFontSize(12);
      doc.setTextColor(40);
      const safeOfferText = "Adjuntamos nuestra mejor oferta técnica y económica, cumpliendo a cabalidad con las especificaciones técnicas solicitadas. Los productos ofrecidos garantizan el estándar requerido por la institución.";
      const splitText = doc.splitTextToSize(safeOfferText, 170);
      doc.text(splitText, 20, 65);

      let totalNetoGlobal = 0;
      const tableBody = items.map((itemObj, i) => {
          const qty = Number(itemObj.cantidad) || 1;
          const finalPrice = calculateItemFinalPrice(i);
          const totalNetoItem = finalPrice * qty;
          totalNetoGlobal += totalNetoItem;
          return [itemObj.nombre || 'Item', qty, `$${finalPrice.toLocaleString('es-CL')}`, `$${totalNetoItem.toLocaleString('es-CL')}`];
      });

      const iva = Math.round(totalNetoGlobal * 0.19);
      const totalBruto = totalNetoGlobal + iva;

      doc.autoTable({
          startY: 65 + (splitText.length * 6) + 10,
          head: [['Producto / Servicio', 'Cant.', 'Precio Unit. Neto', 'Total Neto']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.text(`Subtotal Neto: $${totalNetoGlobal.toLocaleString('es-CL')}`, 130, finalY);
      doc.text(`IVA (19%): $${iva.toLocaleString('es-CL')}`, 130, finalY + 7);
      doc.setFont(undefined, 'bold');
      doc.text(`TOTAL FINAL: $${totalBruto.toLocaleString('es-CL')}`, 130, finalY + 15);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("Documento generado automáticamente por Compras Ágiles Hub", 105, 280, { align: "center" });

      doc.save(`Cotizacion_${details.codigo}.pdf`);
  };

  return (
    <div style={{ marginTop: '30px', padding: '20px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', color: '#c4b5fd' }}>
          <Calculator size={24} /> Cotizador Transparente (Multi-ítem)
        </h3>
        {Object.keys(mlResultsMap).length === 0 && !isAnalyzing && (
          <button onClick={() => handleAnalyze()} className="glass-button primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
            <ShoppingCart size={18} /> Analizar Costos
          </button>
        )}
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '15px' }}>{error}</div>}

      {isAnalyzing && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid rgba(139, 92, 246, 0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
          <p style={{ color: '#c4b5fd' }}>Buscando costos base en Mercado Libre...</p>
        </div>
      )}

      {allItemsHaveResults && (
        <div className="animate-fade-in">
          {items.map((itemObj, index) => (
            <div key={index} style={{ marginBottom: '25px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <h4 style={{ color: 'white', marginBottom: '15px', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Ítem {index + 1}: {itemObj.nombre} <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>(Cant: {itemObj.cantidad})</span></span>
                {aiKeywords && aiKeywords[index] && (
                    <button onClick={() => openMeliPulseModal(index)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #ffe600, #ffb000)', color: '#2d3277', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        <ShoppingCart size={14} /> MeliPulse: Buscar Alternativas
                    </button>
                )}
              </h4>

              {/* Horizontal Scroll List for ML Products */}
              <div style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '10px' }} className="custom-scrollbar">
                {(mlResultsMap[index] || []).map(prod => {
                  const isSelected = selectedMap[index]?.id === prod.id;
                  return (
                    <div key={prod.id} onClick={() => selectProduct(index, prod)} style={{ minWidth: '220px', maxWidth: '220px', background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', cursor: 'pointer', border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)', transition: '0.2s', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', background: 'white', borderRadius: '6px', padding: '5px' }}>
                            <img src={prod.thumbnail} alt={prod.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                        <h5 style={{ fontSize: '0.8rem', marginBottom: '5px', lineHeight: 1.2, height: '28px', overflow: 'hidden' }}>{prod.title}</h5>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#10b981' }}>${prod.price.toLocaleString('es-CL')}</span>
                            {prod.permalink && <a href={prod.permalink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '3px 6px', borderRadius: '4px', textDecoration: 'none' }}>Ver</a>}
                        </div>
                    </div>
                  );
                })}
              </div>

              {/* Calculator Form when product is selected */}
              {selectedMap[index] && (
                <div className="animate-fade-in" style={{ marginTop: '15px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                  <h5 style={{ color: '#60a5fa', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Calculator size={16}/> Valores Finales (Ítem {index + 1})</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end' }}>
                     <div>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Costo del Producto</label>
                       <div style={{ fontSize: '1.2rem', color: 'white', fontWeight: 'bold' }}>${selectedMap[index].price.toLocaleString('es-CL')}</div>
                     </div>
                     <div>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Costo Despacho ($)</label>
                       <input type="number" value={manualInputs[index]?.shipping ?? 0} onChange={(e) => handleManualInputChange(index, 'shipping', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1rem' }} />
                     </div>
                     <div>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>% Margen Ganancia</label>
                       <input type="number" value={manualInputs[index]?.margin ?? 30} onChange={(e) => handleManualInputChange(index, 'margin', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '1rem' }} />
                     </div>
                     <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px', textAlign: 'right' }}>
                       <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PRECIO UNITARIO SUGERIDO</label>
                       <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 'bold' }}>
                         ${calculateItemFinalPrice(index).toLocaleString('es-CL')}
                       </div>
                       <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>x {itemObj.cantidad} unidades</div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {allItemsSelected && (
            <div className="animate-fade-in" style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '25px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginTop: '20px' }}>
                <h4 style={{ fontSize: '1.2rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
                    <CheckCircle size={20} /> Resumen Final y Acciones
                </h4>
                
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                    <button onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>
                        <Download size={18} /> Descargar PDF Cotización
                    </button>
                    <button onClick={() => {
                            if (onMarkSubmitted) {
                                let totalGlobal = 0;
                                items.forEach((itemObj, i) => {
                                    totalGlobal += calculateItemFinalPrice(i) * (Number(itemObj.cantidad) || 1);
                                });
                                onMarkSubmitted({ price: `$${totalGlobal.toLocaleString('es-CL')}` });
                            }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>
                        <CheckCircle size={18} /> Marcar como Postulada
                    </button>
                </div>
            </div>
          )}

          {/* MeliPulse Modal */}
          {meliPulseModal.isOpen && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'var(--bg-dark)', width: '90%', maxWidth: '900px', maxHeight: '85vh', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 176, 0, 0.1)' }}>
                          <h3 style={{ margin: 0, color: '#ffb000', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={20} /> MeliPulse: Búsqueda Manual</h3>
                          <button onClick={closeMeliPulseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                      </div>
                      <div style={{ padding: '20px', display: 'flex', gap: '10px' }}>
                          <input type="text" value={meliPulseModal.query} onChange={(e) => setMeliPulseModal(prev => ({ ...prev, query: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') executeMeliPulseSearch(meliPulseModal.query); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '1rem' }} placeholder="Buscar producto en MeliPulse..." />
                          <button onClick={() => executeMeliPulseSearch(meliPulseModal.query)} disabled={meliPulseModal.isSearching} style={{ padding: '0 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: meliPulseModal.isSearching ? 0.7 : 1 }}>{meliPulseModal.isSearching ? 'Buscando...' : 'Buscar'}</button>
                      </div>
                      <div style={{ padding: '0 20px 20px 20px', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                          {meliPulseModal.isSearching ? (
                              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                  <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,176,0,0.3)', borderTopColor: '#ffb000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
                                  Buscando las mejores alternativas...
                              </div>
                          ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                                  {meliPulseModal.results.map((res, i) => (
                                      <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '15px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                                          <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', background: 'white', borderRadius: '6px', padding: '10px' }}>
                                              <img src={res.thumbnail} alt="img" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                          </div>
                                          <h5 style={{ color: 'white', fontSize: '0.9rem', marginBottom: '10px', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{res.title}</h5>
                                          <p style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 15px 0' }}>${Number(res.price).toLocaleString('es-CL')}</p>
                                          <button onClick={() => selectProductFromModal(res)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Seleccionar</button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}
        </div>
      )}
    </div>
  );
}
