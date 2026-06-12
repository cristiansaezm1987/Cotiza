import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Calendar, DollarSign, Package } from 'lucide-react';

function AsyncDeliveryDays({ item }) {
  const [days, setDays] = useState(item.deliveryDays);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Si ya viene con un número real (ej. desde el Segundo Llamado o ya estaba en la API), lo usamos directo
    if (typeof item.deliveryDays === 'number' || (typeof item.deliveryDays === 'string' && !isNaN(item.deliveryDays))) {
      setDays(item.deliveryDays);
      return;
    }
    
    // Si no, obtenemos el detalle de esta tarjeta en específico
    let isMounted = true;
    setLoading(true);
    fetch(`/api/scrape-detail?id=${item.id}`)
      .then(r => r.json())
      .then(data => {
         if (isMounted && data.success && data.data && data.data.plazo_entrega) {
            setDays(data.data.plazo_entrega);
         } else if (isMounted) {
            setDays('No especificado');
         }
      })
      .catch(() => {
         if (isMounted) setDays('Error');
      })
      .finally(() => {
         if (isMounted) setLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [item.id, item.deliveryDays]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
      <Package size={14} />
      <span>
        <strong style={{fontWeight: 600}}>Plazo de entrega:</strong>{' '}
        {loading ? <span style={{opacity: 0.7}}>Cargando...</span> : 
          <span>{days}{typeof days === 'number' || (typeof days === 'string' && !isNaN(days)) ? ' días' : ''}</span>
        }
      </span>
    </div>
  );
}

export default function DataTable({ data, onRowClick, isLoading, isRefreshingExcel }) {
  if (isLoading) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Buscando y filtrando resultados en tiempo real...</p>
      </div>
    );
  }

  if (isRefreshingExcel && (!data || data.length === 0)) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Analizando miles de registros encriptados en segundo plano...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No se encontraron resultados para los filtros actuales.
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'publicada': return 'var(--success-color)';
      case 'cerrada': return 'var(--danger-color)';
      case 'adjudicada': return 'var(--accent-color)';
      default: return 'var(--warning-color)';
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
      {data.map((item, index) => (
        <div 
          key={item.id || index} 
          className="glass-panel animate-fade-in" 
          onClick={() => onRowClick && onRowClick(item)}
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', animationDelay: `${(index % 10) * 0.05}s`, cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-5px)' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                ID: {item.id}
              </span>
              <span style={{ fontSize: '0.75rem', background: item.callNumber === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: item.callNumber === 1 ? '#60a5fa' : '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {item.callNumber === 1 ? '1er Llamado' : '2do Llamado+'}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: getStatusColor(item.statusName), display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(item.statusName) }}></div>
              {item.statusName}
            </span>
          </div>
          
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.3, minHeight: '3rem' }}>
            {item.name}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={16} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                ${new Intl.NumberFormat('es-CL').format(item.price)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.organization}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} />
              <span>{item.region}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} />
                  <span><strong style={{fontWeight: 600}}>Pub:</strong> {item.date ? item.date.replace(' ', ' a las ') : 'Sin fecha'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-color)' }}>
                  <Calendar size={14} />
                  <span><strong style={{fontWeight: 600}}>Cierre:</strong> {item.closeDate ? item.closeDate.replace(' ', ' a las ') : 'No indicado'}</span>
                </div>
              </div>
              <AsyncDeliveryDays item={item} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
