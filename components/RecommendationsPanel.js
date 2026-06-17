import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertCircle, ShoppingBag } from 'lucide-react';

export default function RecommendationsPanel({ budget, region }) {
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!budget || budget <= 0) return;
        
        const fetchRecs = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let url = `/api/intelligence/recommend?budget=${budget}`;
                if (region) url += `&region=${encodeURIComponent(region)}`;
                
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    setRecommendations(data.data);
                } else {
                    setError(data.error);
                }
            } catch (e) {
                setError("Error cargando recomendaciones");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecs();
    }, [budget, region]);

    if (!budget || budget <= 0) return null;

    return (
        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <Target size={20} /> Oportunidades Recomendadas (IA)
            </h3>
            
            {isLoading && <div style={{ color: 'var(--text-secondary)' }}>Analizando el mercado...</div>}
            {error && <div style={{ color: '#ef4444' }}>{error}</div>}
            
            {!isLoading && !error && recommendations.length === 0 && (
                <div style={{ color: 'var(--text-secondary)' }}>No hay recomendaciones para este presupuesto.</div>
            )}

            {!isLoading && recommendations.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                    {recommendations.map((rec, i) => (
                        <div key={i} style={{ padding: '15px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>{rec.codigo}</div>
                            <h4 style={{ fontSize: '1rem', marginBottom: '10px', height: '40px', overflow: 'hidden' }}>{rec.nombre}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Presupuesto:</span>
                                <span style={{ fontWeight: 'bold' }}>${rec.presupuesto.toLocaleString('es-CL')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Prob. Adjudicación:</span>
                                <span style={{ fontWeight: 'bold', color: '#10b981' }}>{rec.win_probability}%</span>
                            </div>
                            <button className="glass-button" style={{ width: '100%', padding: '8px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                <ShoppingBag size={16} /> Ver Detalle
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
