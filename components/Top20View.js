import React, { useMemo, useState } from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Package, DollarSign, Calendar, MapPin, Building2, Zap } from 'lucide-react';
import DetailModal from './DetailModal';

export default function Top20View({ data, filters }) {
  const [selectedItem, setSelectedItem] = useState(null);

  // Filter the ALREADY VETTED data by ALL filters
  const vettedData = React.useMemo(() => {
    let filtered = data;
    if (filters) {
        if (filters.search) {
           const s = filters.search.toLowerCase();
           filtered = filtered.filter(item => 
               (item.name && item.name.toLowerCase().includes(s)) ||
               (item.id && item.id.toLowerCase().includes(s))
           );
        }
        if (filters.region && filters.region !== '') {
           filtered = filtered.filter(item => item.region && item.region.toLowerCase().includes(filters.region.toLowerCase()));
        }
        if (filters.status && filters.status !== '') {
           filtered = filtered.filter(item => item.statusName === filters.status);
        }
        if (filters.callNumber && filters.callNumber !== '') {
           filtered = filtered.filter(item => String(item.callNumber) === filters.callNumber);
        }
        if (filters.maxPrice && filters.maxPrice !== '') {
           const maxP = Number(filters.maxPrice);
           filtered = filtered.filter(item => Number(item.price) <= maxP);
        }
    }
    return filtered.slice(0, 20); // Show max 20
  }, [data, filters]);

  if (vettedData.length === 0) {
      return (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No se encontraron oportunidades suficientes que cumplan los criterios del algoritmo en esta región.
              <br/><small style={{opacity: 0.6}}>(El escáner de fondo sigue buscando...)</small>
          </div>
      );
  }

  const getScoreColor = (score) => {
      if (score >= 70) return '#10b981'; // Green
      if (score >= 40) return '#f59e0b'; // Yellow
      return '#6b7280'; // Gray
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div className="glass-panel" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
         <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-color)', marginBottom: '10px' }}>
             <Zap size={24} color="#8b5cf6" />
             Top 20 Oportunidades 100% Simples (Tiempo Real)
         </h2>
         <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '15px' }}>
             A medida que el sistema descarga información, el escáner evalúa silenciosamente en segundo plano. Aquí ves los resultados en tiempo real de las oportunidades más rentables cuya información técnica está directamente en la descripción.
         </p>
         <div style={{ fontSize: '0.85rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
             <div style={{ width: '12px', height: '12px', background: '#60a5fa', borderRadius: '50%', boxShadow: '0 0 10px #60a5fa', animation: 'pulse 1.5s infinite' }}></div>
             Escáner continuo activo... ({data.length} oportunidades validadas encontradas)
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {vettedData.map((item, index) => (
          <div 
            key={item.id} 
            className="glass-panel animate-fade-in" 
            onClick={() => setSelectedItem(item)}
            style={{ 
                padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', 
                animationDelay: `${(index % 10) * 0.05}s`, cursor: 'pointer', 
                transition: 'all 0.3s', 
                border: index < 3 ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
                boxShadow: index < 3 ? '0 4px 20px rgba(245, 158, 11, 0.1)' : undefined,
                ':hover': { transform: 'translateY(-5px)' } 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: index < 3 ? '#f59e0b' : 'var(--text-secondary)' }}>
                  #{index + 1}
                </span>
                <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                  {item.id}
                </span>
              </div>
              <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '20px',
                  border: `1px solid ${getScoreColor(item.biScore)}`
              }}>
                 <Target size={14} color={getScoreColor(item.biScore)} />
                 <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: getScoreColor(item.biScore) }}>
                    Score: {item.biScore}
                 </span>
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.3, minHeight: '3rem' }}>
              {item.name}
            </h3>

            {item.descriptionPreview && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    "{item.descriptionPreview}"
                </div>
            )}

            {/* Heuristics Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {item.biReasons.map((reason, i) => (
                    <span key={i} style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        {reason}
                    </span>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} color="#10b981" />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} />
                <span><strong style={{fontWeight: 600}}>Cierre:</strong> {item.closeDate ? item.closeDate.replace(' ', ' a las ') : 'No indicado'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
