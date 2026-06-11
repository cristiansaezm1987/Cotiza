import { useState, useEffect } from 'react';
import { X, Package, MapPin, Building2, Calendar, FileText } from 'lucide-react';

export default function DetailModal({ item, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{details.codigo}</span>
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> Descripción
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {details.descripcion || 'Sin descripción adicional.'}
              </p>
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
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No hay productos listados.</p>
              )}
            </div>

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
