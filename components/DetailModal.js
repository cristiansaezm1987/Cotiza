import { useState, useEffect } from 'react';
import { X, Calendar, FileText, Download, DollarSign, Package, Building2, AlertCircle, Paperclip, Activity, MapPin, Calculator, ShoppingCart } from 'lucide-react';
import SmartQuoter from './SmartQuoter';

export default function DetailModal({ item, onClose, onMarkSubmitted, activeTab, isSelected, onToggleSelection }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [failedPdfs, setFailedPdfs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownload = (file) => {
      setDownloadingId(file.id);
      const url = `/api/download-attachment?id=${file.id}&code=${details.codigo}&name=${encodeURIComponent(file.nombreArchivo || 'adjunto.pdf')}`;
      window.open(url, '_blank');
      setTimeout(() => setDownloadingId(null), 1000);
  };
      
  const handleAnalyzeText = async (additionalText = "") => {
      setIsAnalyzing(true);
      setFailedPdfs([]);
      try {
          let fullText = details.descripcion || '';
          if (details.productos_solicitados) {
              fullText += `\n\nÍTEMS SOLICITADOS (Debe retornar exactamente ${details.productos_solicitados.length} strings de búsqueda en el arreglo 'keywords'):\n` + details.productos_solicitados.map((p, i) => `Ítem ${i+1}: ${p.nombre} - ${p.descripcion}`).join("\n");
          }

          let pdfs = [];
          let currentFailed = [];
          
          // If there are attachments, fetch and extract text from PDFs
          if (details.adjuntos && details.adjuntos.length > 0) {
              for (const file of details.adjuntos) {
                  if (file.nombreArchivo?.toLowerCase().endsWith('.pdf')) {
                      try {
                          const url = `/api/download-attachment?id=${file.id}&code=${details.codigo}&extractText=true`;
                          const res = await fetch(url);
                          const json = await res.json();
                          if (json.success && json.base64) {
                              pdfs.push({ name: file.nombreArchivo, base64: json.base64 });
                          } else {
                              currentFailed.push(file);
                          }
                      } catch (err) {
                          console.error("Error fetching PDF text:", err);
                          currentFailed.push(file);
                      }
                  }
              }
          }

          if (currentFailed.length > 0) {
              setFailedPdfs(currentFailed);
          }

          const res = await fetch('/api/intelligence/read-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: fullText, pdfs: pdfs })
          });
          const json = await res.json();
          if (json.success) {
              setAiAnalysis(json.data);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleManualUpload = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      setIsUploading(true);
      let pdfs = [];
      
      try {
          for (const file of files) {
              const arrayBuffer = await file.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              pdfs.push({ name: file.name, base64: base64 });
          }
          
          if (pdfs.length > 0) {
              setFailedPdfs([]);
              // We pass the new PDFs straight into analysis!
              setIsAnalyzing(true);
              let fullText = details.descripcion || '';
              if (details.productos_solicitados) {
                  fullText += `\n\nÍTEMS SOLICITADOS (Debe retornar exactamente ${details.productos_solicitados.length} strings de búsqueda en el arreglo 'keywords'):\n` + details.productos_solicitados.map((p, i) => `Ítem ${i+1}: ${p.nombre} - ${p.descripcion}`).join("\n");
              }
              const res = await fetch('/api/intelligence/read-text', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: fullText, pdfs: pdfs })
              });
              const json = await res.json();
              if (json.success) {
                  setAiAnalysis(json.data);
              }
          }
      } catch (err) {
          console.error("Upload error:", err);
          alert("Ocurrió un error al subir el archivo.");
      } finally {
          setIsAnalyzing(false);
          setIsUploading(false);
          e.target.value = null;
      }
  };

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/scrape-detail?id=${item.id}`);
        const data = await res.json();
        if (data.success) {
          setDetails(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Error al obtener los detalles');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [item]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Obteniendo detalles completos...</p>
          </div>
        ) : error ? (
          <div style={{ color: 'var(--danger-color)', textAlign: 'center', padding: '40px' }}>
            <p>{error}</p>
          </div>
        ) : details ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{details.codigo}</span>
                <span style={{ fontSize: '0.8rem', background: item.callNumber === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: item.callNumber === 1 ? '#60a5fa' : '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {item.callNumber === 1 ? '1er Llamado' : '2do Llamado+'}
                </span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '8px', marginBottom: '16px' }}>{details.nombre}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Building2 size={16} /> <span>{details.informacion_institucion?.organismo_comprador || item.organization}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={16} /> <span>Cierra: {details.fecha_cierre || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} /> Descripción
                  </h3>
                  {activeTab === 'postulations' && (
                      <button 
                         onClick={handleAnalyzeText} 
                         disabled={isAnalyzing}
                         style={{
                             background: 'linear-gradient(90deg, #10b981, #059669)', border: 'none', color: 'white',
                             padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                             display: 'flex', alignItems: 'center', gap: '5px'
                         }}>
                          {isAnalyzing ? 'Procesando documentos e IA...' : '✨ Analizar con IA'}
                      </button>
                  )}
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {details.descripcion || 'Sin descripción adicional.'}
              </p>
              
              {aiAnalysis && (
                  <div className="animate-fade-in" style={{ marginTop: '15px', padding: '15px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px' }}>
                      <h4 style={{ color: '#10b981', fontSize: '1rem', marginBottom: '10px', display: 'flex', gap: '5px' }}>
                          ✨ Análisis de Inteligencia Artificial
                      </h4>
                      <p style={{ color: 'white', fontSize: '0.9rem', marginBottom: '10px' }}>{aiAnalysis.summary}</p>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.8rem', background: aiAnalysis.complexity === 'alta' ? 'rgba(239,68,68,0.2)' : aiAnalysis.complexity === 'baja' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: aiAnalysis.complexity === 'alta' ? '#ef4444' : aiAnalysis.complexity === 'baja' ? '#10b981' : '#fbbf24', padding: '4px 8px', borderRadius: '4px' }}>
                              Complejidad: {aiAnalysis.complexity.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.8rem', background: aiAnalysis.is_profitable ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: aiAnalysis.is_profitable ? '#10b981' : '#ef4444', padding: '4px 8px', borderRadius: '4px' }}>
                              {aiAnalysis.is_profitable ? 'Alta Rentabilidad' : 'Baja Rentabilidad'}
                          </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <strong>Términos de Búsqueda Sugeridos: </strong> 
                          {aiAnalysis.keywords.map((k, i) => (
                              <span key={i} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '5px' }}>{k}</span>
                          ))}
                      </div>
                  </div>
              )}

              {failedPdfs.length > 0 && (
                  <div className="animate-fade-in" style={{ marginTop: '15px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px' }}>
                      <h4 style={{ color: '#ef4444', fontSize: '0.95rem', marginBottom: '8px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                          ⚠️ Ciberseguridad de Mercado Público detectada
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                          El sistema tiene el nombre del archivo, pero Mercado Público ha bloqueado la descarga automática invisible mediante Cloudflare. 
                          Para que la IA lo lea, necesitas descargar el archivo tú mismo y subirlo aquí:
                      </p>
                      
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                          <input 
                              type="file" 
                              accept=".pdf" 
                              multiple 
                              onChange={handleManualUpload} 
                              disabled={isUploading}
                              style={{
                                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                              }} 
                          />
                          <button style={{ 
                              background: '#3b82f6', color: 'white', border: 'none', padding: '6px 14px', 
                              borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' 
                          }}>
                              <Paperclip size={16} /> 
                              {isUploading ? 'Procesando PDF e IA...' : 'Adjuntar PDF manualmente'}
                          </button>
                      </div>
                  </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} /> Dirección de Entrega
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  {details.direccion_entrega || 'No especificada'}
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} /> Plazo de Entrega
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  {details.plazo_entrega ? `${details.plazo_entrega} días` : 'No especificado'}
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '20px', borderRadius: '12px', marginTop: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calculator size={18} /> Presupuesto Estimado
                </h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>
                  {details.presupuesto_estimado ? `$${details.presupuesto_estimado.toLocaleString('es-CL')}` : 'No disponible'}
                </p>
            </div>

            <div>
              {(details.id_estado === 4 || details.id_estado === 3) && (
                (() => {
                  const winner = details.proveedores_cotizando?.find(p => p.proveedor_seleccionado === 1);
                  if (winner) {
                    return (
                      <div style={{ background: 'rgba(46, 204, 113, 0.1)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--success-color)', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success-color)', marginBottom: '8px' }}>
                          Proveedor Adjudicado
                        </h3>
                        <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {winner.razon_social} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>(RUT: {winner.rut_proveedor})</span>
                        </p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Monto adjudicado: ${Number(winner.monto_total).toLocaleString('es-CL')}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '15px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} /> Productos Solicitados ({details.productos_solicitados?.length || 0})
              </h3>
              {details.productos_solicitados && details.productos_solicitados.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {details.productos_solicitados.map((prod, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{prod.nombre}</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Cant: {prod.cantidad} {prod.unidad_medida}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{prod.descripcion}</p>
                      
                      {aiAnalysis && aiAnalysis.keywords && aiAnalysis.keywords[idx] && (
                          <div className="animate-fade-in" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-start' }}>
                              <a 
                                  href={`https://listado.mercadolibre.cl/${encodeURIComponent(aiAnalysis.keywords[idx].replace(/\s+/g, '-'))}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ 
                                      display: 'flex', alignItems: 'center', gap: '8px', 
                                      padding: '8px 16px', borderRadius: '6px', 
                                      background: 'linear-gradient(90deg, #ffe600, #ffb000)', 
                                      color: '#2d3277', fontWeight: 'bold', textDecoration: 'none',
                                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)', fontSize: '0.9rem'
                                  }}
                                  title={`Búsqueda Inteligente: ${aiAnalysis.keywords[idx]}`}
                              >
                                  <ShoppingCart size={16} /> MeliPulse: Ver opciones (Filtros, Envío Full)
                              </a>
                          </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No hay productos listados.</p>
              )}
            </div>

            {details.adjuntos && details.adjuntos.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginTop: '10px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paperclip size={20} /> Archivos Adjuntos ({details.adjuntos.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {details.adjuntos.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 15px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-word', paddingRight: '15px' }}>
                        {file.nombreArchivo}
                      </span>
                      <button 
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          padding: '8px 12px', background: 'var(--primary-color)', color: 'white', 
                          border: 'none', borderRadius: '6px', cursor: downloadingId === file.id ? 'wait' : 'pointer',
                          opacity: downloadingId === file.id ? 0.7 : 1, transition: '0.2s', minWidth: '130px', justifyContent: 'center'
                        }}
                      >
                        {downloadingId === file.id ? (
                          <>
                            <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <span style={{ fontSize: '0.85rem' }}>Descargando...</span>
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Descargar</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Quoter Component or Selection Checkbox depending on active tab */}
            {activeTab === 'postulations' ? (
                <SmartQuoter 
                    item={item} 
                    details={details} 
                    aiKeywords={aiAnalysis?.keywords} 
                    onMarkSubmitted={onMarkSubmitted}
                />
            ) : (
                <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h4 style={{ margin: '0 0 5px', color: '#60a5fa', fontSize: '1.1rem' }}>¿Te interesa esta licitación?</h4>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Selecciónala para cotizarla con la Inteligencia Artificial en la pestaña de Postulaciones.</p>
                    </div>
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            if(onToggleSelection) {
                                onToggleSelection(item, !isSelected);
                            }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', background: isSelected ? '#10b981' : 'rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', color: 'white', fontWeight: 'bold' }}>
                        <input 
                            type="checkbox" 
                            checked={isSelected || false}
                            readOnly
                            style={{ transform: 'scale(1.5)', cursor: 'pointer', pointerEvents: 'none' }}
                        />
                        {isSelected ? 'Seleccionada' : 'Seleccionar'}
                    </div>
                </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <a 
                href={`https://buscador.mercadopublico.cl/ficha?code=${details.codigo}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 500, transition: '0.2s', ':hover': { opacity: 0.9 } }}
              >
                Ver en Mercado Público
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
