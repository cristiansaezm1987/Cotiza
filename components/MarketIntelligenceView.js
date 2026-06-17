import React, { useState } from 'react';
import { Search, TrendingUp, AlertTriangle, Package, Calendar, Download, Building2, ChevronRight, CheckCircle, Clock } from 'lucide-react';

export default function MarketIntelligenceView() {
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [days, setDays] = useState(1);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearched(true);

    try {
        const res = await fetch(`/api/market-intelligence?q=${encodeURIComponent(keyword)}&days=${days}`);
        const data = await res.json();
        
        if (data.success) {
            setResults(data.data);
        } else {
            setError(data.error || 'Error al buscar datos históricos.');
            setResults([]);
        }
    } catch (err) {
        console.error(err);
        setError('Error de conexión con el servidor de inteligencia.');
    } finally {
        setIsLoading(false);
    }
  };

  const calculateAverages = () => {
      if (results.length === 0) return { avgPrice: 0, highestPrice: 0, lowestPrice: 0, totalVolume: 0 };
      
      let sumPrices = 0;
      let highest = 0;
      let lowest = Infinity;
      let vol = 0;
      let validPrices = 0;

      results.forEach(order => {
          if (order.items && order.items.length > 0) {
              order.items.forEach(item => {
                  const price = item.precioNeto;
                  if (price > 0) {
                      sumPrices += price;
                      validPrices++;
                      if (price > highest) highest = price;
                      if (price < lowest) lowest = price;
                  }
                  vol += item.cantidad;
              });
          }
      });

      return {
          avgPrice: validPrices > 0 ? (sumPrices / validPrices) : 0,
          highestPrice: highest,
          lowestPrice: lowest === Infinity ? 0 : lowest,
          totalVolume: vol
      };
  };

  const formatCLP = (num) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(num);
  };

  const stats = calculateAverages();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.5s ease-in-out' }}>
      
      <div className="glass-panel" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
         <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '15px' }}>
             <TrendingUp size={28} />
             Inteligencia de Mercado (Histórico Oficial)
         </h2>
         <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '25px', maxWidth: '800px', lineHeight: '1.6' }}>
             Este motor utiliza tu <strong>API Ticket de Mercado Público</strong> para descargar las Órdenes de Compra reales de los últimos días y buscar exactamente lo que necesitas.
             Descubre a <strong>qué precio está comprando el Estado</strong> y ajusta tus márgenes para ganar las licitaciones actuales.
         </p>

         <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px', maxWidth: '700px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                    type="text" 
                    placeholder="Ej: Computador, Resmas, Toner..." 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem' }}
                />
            </div>
            <select 
                value={days} 
                onChange={(e) => setDays(Number(e.target.value))}
                style={{ padding: '0 20px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', cursor: 'pointer' }}
            >
                <option value={1}>Último Día (Rápido)</option>
                <option value={2}>Últimos 2 Días</option>
                <option value={3}>Últimos 3 Días</option>
            </select>
            <button 
                type="submit" 
                disabled={isLoading || !keyword.trim()}
                style={{
                    padding: '0 30px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px',
                    fontWeight: 'bold', fontSize: '1rem', cursor: (isLoading || !keyword.trim()) ? 'not-allowed' : 'pointer', transition: '0.2s',
                    opacity: (isLoading || !keyword.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '10px'
                }}
            >
                {isLoading ? (
                    <><div style={{ width: '18px', height: '18px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> Analizando...</>
                ) : (
                    <><Search size={20} /> Buscar Precios</>
                )}
            </button>
         </form>
      </div>

      {isLoading && (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <div>
                  <h3 style={{ margin: '0 0 10px 0', color: 'white' }}>Escaneando Órdenes de Compra Oficiales...</h3>
                  <p style={{ margin: 0 }}>Descargando y filtrando registros diarios desde la API. Esto puede tomar unos 10-15 segundos.</p>
              </div>
          </div>
      )}

      {error && !isLoading && (
          <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} />
              <span>{error}</span>
          </div>
      )}

      {searched && !isLoading && !error && results.length === 0 && (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Package size={48} style={{ margin: '0 auto 20px auto', opacity: 0.5 }} />
              <h3 style={{ color: 'white', marginBottom: '10px' }}>No hay compras recientes</h3>
              <p>No se encontraron Órdenes de Compra que coincidan con "{keyword}" en los últimos {days} días.</p>
          </div>
      )}

      {searched && !isLoading && !error && results.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '4px solid #10b981' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Precio Promedio Pagado</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>{formatCLP(stats.avgPrice)}</span>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '4px solid #3b82f6' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Precio Máximo Pagado</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>{formatCLP(stats.highestPrice)}</span>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '4px solid #8b5cf6' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Volumen Comprado</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>{stats.totalVolume} Unds.</span>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '4px solid #f59e0b' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Órdenes Encontradas</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>{results.length}</span>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '25px', overflow: 'hidden' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'white' }}>Detalle de Compras Recientes</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Fecha OC</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Comprador</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Producto Específico (Item)</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cant.</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Precio Neto Unit.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((order, idx) => {
                                const items = order.items || [];
                                return items.map((item, itemIdx) => (
                                    <tr key={`${idx}-${itemIdx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                        <td style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {order.fecha}
                                        </td>
                                        <td style={{ padding: '15px 10px', color: 'white', maxWidth: '250px' }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{order.comprador}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '4px' }}>OC: {order.codigo}</div>
                                        </td>
                                        <td style={{ padding: '15px 10px', color: 'var(--text-secondary)', maxWidth: '350px' }}>
                                            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{item.especificacion}</div>
                                        </td>
                                        <td style={{ padding: '15px 10px', color: 'white', fontWeight: 'bold' }}>
                                            {item.cantidad}
                                        </td>
                                        <td style={{ padding: '15px 10px', color: '#10b981', fontWeight: 'bold' }}>
                                            {formatCLP(item.precioNeto)}
                                        </td>
                                    </tr>
                                ));
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
      )}
    </div>
  );
}
