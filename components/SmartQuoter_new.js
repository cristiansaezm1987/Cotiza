import React, { useState } from 'react';
import { Bot, ShoppingCart, Calculator, Download, CheckCircle, FileText, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function SmartQuoter({ item, details, aiKeywords, onMarkSubmitted }) {
  const items = (details.productos_solicitados && details.productos_solicitados.length > 0)
    ? details.productos_solicitados
    : [{ nombre: details.nombre, cantidad: 1, id_fallback: 'item-0' }];

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mlResultsMap, setMlResultsMap] = useState({});
  const [selectedMap, setSelectedMap] = useState({});
  
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [quotesMap, setQuotesMap] = useState({});
  const [formalOfferText, setFormalOfferText] = useState("");
  
  const [error, setError] = useState(null);

  const handleAnalyze = async (keywordsToUse = aiKeywords) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const newResultsMap = {};
      
      for (let i = 0; i < items.length; i++) {
        let query = items[i].nombre;
        // Si es el primer ítem y tenemos keywords de la IA, lo priorizamos
        if (i === 0 && keywordsToUse && keywordsToUse.length > 0) {
            query = keywordsToUse.join(" ");
        }
        
        const res = await fetch(`/api/mercadolibre?q=${encodeURIComponent(query)}`);
        let data = {};
        try { data = await res.json(); } catch (e) {}

        if (res.ok && data.success && data.results) {
           newResultsMap[i] = data.results;
        } else {
           newResultsMap[i] = [];
        }
      }
      setMlResultsMap(newResultsMap);
    } catch (e) {
      console.error(e);
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
  };

  const generateQuote = async () => {
      setIsGeneratingQuote(true);
      setError(null);
      setQuotesMap({});
      
      try {
          const newQuotesMap = {};
          let finalError = null;
          let combinedOfferText = "";

          for (let i = 0; i < items.length; i++) {
              const product = selectedMap[i];
              if (!product) continue;

              const itemName = items[i].nombre;
              
              // 1. Get historical intelligence
              const histRes = await fetch(`/api/market-intelligence?q=${encodeURIComponent(itemName)}&days=3`);
              const histData = await histRes.json();
              
              let historyAvg = 0;
              let historyMax = 0;
              let historyVol = 0;

              if (histData.success && histData.data && histData.data.length > 0) {
                  let sumPrices = 0;
                  let validPrices = 0;
                  histData.data.forEach(order => {
                      order.items?.forEach(orderItem => {
                          if (orderItem.precioNeto > 0) {
                              sumPrices += orderItem.precioNeto;
                              validPrices++;
                              if (orderItem.precioNeto > historyMax) historyMax = orderItem.precioNeto;
                          }
                          historyVol += orderItem.cantidad || 0;
                      });
                  });
                  historyAvg = validPrices > 0 ? Math.round(sumPrices / validPrices) : 0;
              }

              // 2. Cross-reference with Gemini
              const aiRes = await fetch('/api/intelligence/generate-quote', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      productName: itemName,
                      cost: product.price,
                      historyData: { average: historyAvg, max: historyMax, items: [] }
                  })
              });
              
              const aiData = await aiRes.json();
              
              if (aiData.success) {
                  newQuotesMap[i] = {
                      ...aiData.data,
                      historyAvg,
                      historyMax,
                      mlCost: product.price
                  };
                  if (aiData.data.offerText && i === 0) {
                      combinedOfferText = aiData.data.offerText;
                  }
              } else {
                  // Fallback seguro en caso de error en un item específico
                  const defaultMargin = 1.4; // 40%
                  let fallbackPrice = Math.round(product.price * defaultMargin);
                  // Si el histórico existe y es un poco mayor, usarlo
                  if (historyAvg > fallbackPrice) fallbackPrice = Math.round(historyAvg * 0.95);
                  
                  newQuotesMap[i] = {
                      suggestedPrice: fallbackPrice,
                      reasoning: "Se ha aplicado un cálculo de margen predeterminado debido a falta de datos IA.",
                      offerText: "Cumple con todas las especificaciones técnicas solicitadas.",
                      historyAvg,
                      historyMax,
                      mlCost: product.price
                  };
                  if (i === 0) combinedOfferText = newQuotesMap[i].offerText;
              }
          }

          setQuotesMap(newQuotesMap);
          setFormalOfferText(combinedOfferText);

      } catch (e) {
          console.error(e);
          setError('Error general de conexión al procesar la cotización matemática.');
      } finally {
          setIsGeneratingQuote(false);
      }
  };

  const allItemsHaveResults = Object.keys(mlResultsMap).length === items.length;
  const allItemsSelected = items.every((_, i) => selectedMap[i]);
  const hasGeneratedQuotes = Object.keys(quotesMap).length === items.length;

  const downloadPDF = () => {
      if (!hasGeneratedQuotes) return;

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(59, 130, 246);
      doc.text("COTIZACIÓN FORMAL", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 20, 35);
      doc.text(`Ref Licitación / Compra Ágil: ${details.codigo}`, 20, 42);
      doc.text(`Comprador: ${details.comprador?.nombre_organismo || details.informacion_institucion?.organismo_comprador || 'Institución Pública'}`, 20, 49);

      // Body Text
      doc.setFontSize(12);
      doc.setTextColor(40);
      const safeOfferText = formalOfferText || "Adjuntamos nuestra mejor oferta técnica y económica, cumpliendo a cabalidad con las especificaciones técnicas solicitadas.";
      const splitText = doc.splitTextToSize(safeOfferText, 170);
      doc.text(splitText, 20, 65);

      // Table Data
      let totalNetoGlobal = 0;
      const tableBody = items.map((itemObj, i) => {
          const qty = Number(itemObj.cantidad) || 1;
          const finalPrice = Number(quotesMap[i]?.suggestedPrice) || 0;
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

      // Totals
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.text(`Subtotal Neto: $${totalNetoGlobal.toLocaleString('es-CL')}`, 130, finalY);
      doc.text(`IVA (19%): $${iva.toLocaleString('es-CL')}`, 130, finalY + 7);
      doc.setFont(undefined, 'bold');
      doc.text(`TOTAL FINAL: $${totalBruto.toLocaleString('es-CL')}`, 130, finalY + 15);

      // Footer
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
          <Bot size={24} /> Cotizador Inteligente Híbrido (Multi-ítem)
        </h3>
        
        {Object.keys(mlResultsMap).length === 0 && !isAnalyzing && (
          <button 
            onClick={() => handleAnalyze(aiKeywords)}
            className="glass-button primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
          >
            <ShoppingCart size={18} /> Analizar Costos
          </button>
        )}
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '15px' }}>{error}</div>}

      {isAnalyzing && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid rgba(139, 92, 246, 0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
          <p style={{ color: '#c4b5fd' }}>Buscando costos base de proveedores en Mercado Libre para todos los ítems...</p>
        </div>
      )}

      {allItemsHaveResults && !hasGeneratedQuotes && !isGeneratingQuote && (
        <div className="animate-fade-in">
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Selecciona tu costo base de Mercado Libre para cada ítem:</p>
          
          {items.map((itemObj, index) => (
            <div key={index} style={{ marginBottom: '25px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <h4 style={{ color: 'white', marginBottom: '15px', fontSize: '1rem' }}>Ítem {index + 1}: {itemObj.nombre} <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>(Cant: {itemObj.cantidad})</span></h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                {(mlResultsMap[index] || []).slice(0, 4).map(prod => {
                  const isSelected = selectedMap[index]?.id === prod.id;
                  return (
                    <div 
                      key={prod.id} 
                      onClick={() => selectProduct(index, prod)}
                      style={{ 
                        background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)', 
                        padding: '12px', borderRadius: '8px', cursor: 'pointer',
                        border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)', 
                        transition: '0.2s', display: 'flex', flexDirection: 'column',
                        ':hover': { borderColor: isSelected ? '#10b981' : '#8b5cf6' }
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <img src={prod.thumbnail} alt={prod.title} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '4px', background: 'white' }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <h5 style={{ fontSize: '0.8rem', marginBottom: '5px', lineHeight: 1.2, height: '28px', overflow: 'hidden' }}>{prod.title}</h5>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 600, color: '#10b981' }}>${prod.price.toLocaleString('es-CL')}</span>
                                  {prod.permalink && (
                                      <a 
                                          href={prod.permalink} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '3px 6px', borderRadius: '4px', textDecoration: 'none' }}
                                      >
                                          Ver
                                      </a>
                                  )}
                              </div>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {allItemsSelected && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button 
                  onClick={generateQuote}
                  className="glass-button success"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1.1rem' }}
                >
                  <Calculator size={20} /> Generar Cotización Matemática Completa
                </button>
            </div>
          )}
        </div>
      )}

      {isGeneratingQuote && (
        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
          <Activity size={32} color="#8b5cf6" style={{ animation: 'pulse 1.5s infinite', margin: '0 auto 15px' }} />
          <h4 style={{ color: 'white', marginBottom: '5px' }}>Cruzando Datos con Inteligencia Histórica</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analizando qué pagó el Estado ayer vs tu costo hoy para cada ítem...</p>
        </div>
      )}

      {hasGeneratedQuotes && (
         <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', padding: '25px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h4 style={{ fontSize: '1.2rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0' }}>
                <CheckCircle size={20} /> Estrategia de Precios Generada
            </h4>
            
            {items.map((itemObj, i) => {
                const q = quotesMap[i];
                return (
                    <div key={i} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, paddingRight: '20px' }}>
                                <h5 style={{ color: '#c4b5fd', margin: '0 0 5px 0', fontSize: '1rem' }}>{itemObj.nombre}</h5>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                    {q.reasoning}
                                </p>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>Costo ML: ${q.mlCost?.toLocaleString('es-CL')}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Hist. Promedio: ${q.historyAvg?.toLocaleString('es-CL')}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Hist. Max: ${q.historyMax?.toLocaleString('es-CL')}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)', padding: '10px 15px', borderRadius: '8px', minWidth: '150px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PRECIO SUGERIDO UN.</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                                    ${(q.suggestedPrice || 0).toLocaleString('es-CL')}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                                    x {itemObj.cantidad} un.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '25px', borderLeft: '4px solid #8b5cf6' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#c4b5fd', fontSize: '0.95rem' }}>Texto Formal Consolidado para la Oferta:</h5>
                <p style={{ color: 'white', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {formalOfferText}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button 
                    onClick={downloadPDF}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                >
                    <Download size={18} /> Descargar Cotización PDF Multi-ítem
                </button>
                <button 
                    onClick={() => {
                        try {
                            if (onMarkSubmitted) {
                                let totalGlobal = 0;
                                items.forEach((itemObj, i) => {
                                    const qty = Number(itemObj.cantidad) || 1;
                                    const price = Number(quotesMap[i]?.suggestedPrice) || 0;
                                    totalGlobal += price * qty;
                                });
                                onMarkSubmitted({ price: `$${totalGlobal.toLocaleString('es-CL')}` });
                            }
                        } catch (e) {
                            console.error("Mark submitted error:", e);
                            alert("Ocurrió un error al marcar como postulada: " + e.message);
                        }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                >
                    <CheckCircle size={18} /> Marcar como Postulada Total
                </button>
            </div>
         </div>
      )}

    </div>
  );
}
