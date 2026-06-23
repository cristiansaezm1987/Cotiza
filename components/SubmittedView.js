import React, { useState } from 'react';
import { Package, Truck, Percent, Calculator, ExternalLink, TrendingUp, CheckCircle, XCircle, Clock, Copy, Download, Trash2, Edit } from 'lucide-react';
import { generatePDF } from '../lib/pdfGenerator';

export default function SubmittedView({ submittedBids, onStatusChange, onDeleteBid, onEditBid }) {
    const [selectedItem, setSelectedItem] = useState(null);

    // Calculate stats
    const stats = {
        total: submittedBids.length,
        won: submittedBids.filter(b => b.bidStatus === 'ganada').length,
        lost: submittedBids.filter(b => b.bidStatus === 'perdida').length,
        pending: submittedBids.filter(b => b.bidStatus === 'postulada').length,
        totalValue: submittedBids.reduce((acc, b) => acc + (b.biddedPrice || 0), 0),
        wonValue: submittedBids.filter(b => b.bidStatus === 'ganada').reduce((acc, b) => acc + (b.biddedPrice || 0), 0)
    };

    const handleStatusChange = (tender, newStatus) => {
        if (onStatusChange) {
            onStatusChange(tender, newStatus);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.5s ease-in-out' }}>
            {/* Mini Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '15px', borderRadius: '50%', color: '#3b82f6' }}>
                        <Clock size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Postuladas (Espera)</p>
                        <h3 style={{ margin: '5px 0 0 0', fontSize: '1.5rem' }}>{stats.pending}</h3>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '15px', borderRadius: '50%', color: '#10b981' }}>
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ganadas</p>
                        <h3 style={{ margin: '5px 0 0 0', fontSize: '1.5rem', color: '#10b981' }}>{stats.won}</h3>
                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>
                            ${stats.wonValue.toLocaleString('es-CL')}
                        </span>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '15px', borderRadius: '50%', color: '#ef4444' }}>
                        <XCircle size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Perdidas</p>
                        <h3 style={{ margin: '5px 0 0 0', fontSize: '1.5rem', color: '#ef4444' }}>{stats.lost}</h3>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '15px', borderRadius: '50%', color: '#8b5cf6' }}>
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monto Total Cotizado</p>
                        <h3 style={{ margin: '5px 0 0 0', fontSize: '1.5rem', color: '#8b5cf6' }}>
                            ${stats.totalValue.toLocaleString('es-CL')}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Lista de Licitaciones */}
            <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ marginTop: 0, color: 'white', marginBottom: '20px' }}>Detalle de Licitaciones</h3>
                {submittedBids.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No tienes licitaciones postuladas aún.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>ID Licitación</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Fecha</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Monto Cotizado</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Margen Real</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Estado</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>Cotización PDF</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}></th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {submittedBids.map((bid) => {
                                // Calcular margen real
                                let realMargin = 0;
                                const draft = bid.postulationDraft || {};
                                if (draft.itemsData && draft.itemsData.length > 0) {
                                    let totalCost = Number(draft.shippingCost) || 0;
                                    draft.itemsData.forEach(item => { totalCost += (item.unitCost || 0) * (item.qty || 1); });
                                    const totalBidded = bid.biddedPrice || 0;
                                    if (totalCost > 0) {
                                        realMargin = Math.round(((totalBidded - totalCost) / totalCost) * 100);
                                    }
                                } else {
                                    realMargin = draft.margin || 0;
                                }

                                return (
                                    <tr 
                                        key={bid.id} 
                                        onClick={() => setSelectedItem(selectedItem?.id === bid.id ? null : bid)}
                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s', cursor: 'pointer', background: selectedItem?.id === bid.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                                    >
                                        <td style={{ padding: '15px 10px', color: '#60a5fa', fontWeight: 'bold' }}>{bid.id}</td>
                                        <td style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>{bid.biddedDate || 'N/A'}</td>
                                        <td style={{ padding: '15px 10px', color: '#10b981', fontWeight: 'bold' }}>
                                            ${(bid.biddedPrice || 0).toLocaleString('es-CL')}
                                        </td>
                                        <td style={{ padding: '15px 10px', color: '#8b5cf6' }}>{realMargin}%</td>
                                        <td style={{ padding: '15px 10px' }}>
                                            <select 
                                                value={bid.bidStatus || 'postulada'} 
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleStatusChange(bid, e.target.value)}
                                                style={{ 
                                                    background: bid.bidStatus === 'ganada' ? 'rgba(16, 185, 129, 0.2)' : 
                                                                bid.bidStatus === 'perdida' ? 'rgba(239, 68, 68, 0.2)' : 
                                                                'rgba(59, 130, 246, 0.2)', 
                                                    color: bid.bidStatus === 'ganada' ? '#10b981' : 
                                                           bid.bidStatus === 'perdida' ? '#ef4444' : 
                                                           '#3b82f6',
                                                    border: 'none', padding: '5px 10px', borderRadius: '5px', outline: 'none', cursor: 'pointer', fontWeight: 'bold'
                                                }}
                                            >
                                                <option value="postulada">En Espera</option>
                                                <option value="ganada">Ganada</option>
                                                <option value="perdida">Perdida</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '15px 10px' }}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const finalCalc = {
                                                        finalProduct: draft.productCost || 0,
                                                        finalShipping: draft.shippingCost || 0,
                                                        total: bid.biddedPrice || 0
                                                    };
                                                    generatePDF(bid, draft, finalCalc);
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                            >
                                                <Download size={16} /> PDF
                                            </button>
                                        </td>
                                        <td style={{ padding: '15px 10px' }}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEditBid) onEditBid(bid);
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', opacity: 0.8 }}
                                                title="Editar Licitación"
                                            >
                                                <Edit size={18} />
                                            </button>
                                        </td>
                                        <td style={{ padding: '15px 10px' }}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('¿Estás seguro de que deseas eliminar esta licitación de la lista?')) {
                                                        if (onDeleteBid) onDeleteBid(bid);
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                                                title="Eliminar Postulación"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detalle en Modal */}
            {selectedItem && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s' }} 
                    onClick={() => setSelectedItem(null)}
                >
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setSelectedItem(null)} 
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            &times;
                        </button>
                        <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Detalle de Licitación: {selectedItem.id}
                            <button 
                                onClick={() => navigator.clipboard.writeText(selectedItem.id)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                                title="Copiar ID"
                            >
                                <Copy size={14} />
                            </button>
                        </h3>
                        <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>{selectedItem.name}</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            {/* Resumen Global (Fallback o Totales) */}
                            {(!selectedItem.postulationDraft?.itemsData || selectedItem.postulationDraft.itemsData.length === 0) ? (
                                <>
                                    <div>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.85rem' }}>
                                            <Package size={16} /> Costo Producto
                                        </span>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            ${Number(selectedItem.postulationDraft?.productCost || 0).toLocaleString('es-CL')}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.85rem' }}>
                                            <Percent size={16} /> Margen Aplicado
                                        </span>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                                            {selectedItem.postulationDraft?.margin || 0}%
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                                        <h4 style={{ margin: '0 0 10px', color: '#60a5fa', fontSize: '1rem' }}>Desglose por Ítem (Motor Cotizador)</h4>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <th style={{ padding: '8px', color: '#9ca3af' }}>Requerimiento</th>
                                                        <th style={{ padding: '8px', color: '#9ca3af' }}>Selección</th>
                                                        <th style={{ padding: '8px', color: '#9ca3af' }}>Costo U.</th>
                                                        <th style={{ padding: '8px', color: '#9ca3af' }}>Margen</th>
                                                        <th style={{ padding: '8px', color: '#9ca3af' }}>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedItem.postulationDraft.itemsData.map((item, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '8px', maxWidth: '150px' }}>
                                                                <div style={{ fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.nombre}>{item.nombre}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Cant: {item.qty}</div>
                                                            </td>
                                                            <td style={{ padding: '8px', maxWidth: '180px' }}>
                                                                <div style={{ color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.selectedTitle}>{item.selectedTitle || 'N/A'}</div>
                                                                {item.link && (
                                                                    <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.75rem', textDecoration: 'none' }}><ExternalLink size={10} style={{display:'inline'}}/> Link</a>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '8px', color: 'white' }}>${(item.unitCost || 0).toLocaleString('es-CL')}</td>
                                                            <td style={{ padding: '8px', color: '#8b5cf6' }}>{item.marginPct}%</td>
                                                            <td style={{ padding: '8px', color: '#10b981', fontWeight: 'bold' }}>${(item.totalFinalPrice || 0).toLocaleString('es-CL')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.85rem' }}>
                                    <Truck size={16} /> Costo Envío
                                </span>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    ${Number(selectedItem.postulationDraft?.shippingCost || 0).toLocaleString('es-CL')}
                                </div>
                            </div>
                            <div>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.85rem' }}>
                                    <Calculator size={16} /> Total Ofertado
                                </span>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>
                                    ${(selectedItem.biddedPrice || 0).toLocaleString('es-CL')}
                                </div>
                            </div>
                        </div>

                        {(!selectedItem.postulationDraft?.itemsData || selectedItem.postulationDraft.itemsData.length === 0) && selectedItem.postulationDraft?.supplierLink && (
                            <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enlace del Proveedor:</h4>
                                <a 
                                    href={selectedItem.postulationDraft.supplierLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', wordBreak: 'break-all' }}
                                >
                                    <ExternalLink size={16} /> {selectedItem.postulationDraft.supplierLink}
                                </a>
                            </div>
                        )}

                        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => {
                                    const finalCalc = {
                                        finalProduct: selectedItem.postulationDraft?.productCost || 0,
                                        finalShipping: selectedItem.postulationDraft?.shippingCost || 0,
                                        total: selectedItem.biddedPrice || 0
                                    };
                                    generatePDF(selectedItem, selectedItem.postulationDraft || {}, finalCalc);
                                }}
                                style={{ 
                                    background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', 
                                    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' 
                                }}
                            >
                                <Download size={18} /> Descargar PDF Cotización
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
