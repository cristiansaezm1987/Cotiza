import React, { useState } from 'react';
import { Package, Truck, Percent, Calculator, ExternalLink, TrendingUp, CheckCircle, XCircle, Clock, Copy, Download, Trash2, Edit, Save, X } from 'lucide-react';
import { generatePDF } from '../lib/pdfGenerator';
import IntelligentWidget from './IntelligentWidget';

export default function SubmittedView({ submittedBids, onStatusChange, onDeleteBid, onUpdateBid }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editDraft, setEditDraft] = useState({});
    
    // Filters
    const [filters, setFilters] = useState({
        region: '',
        callNumber: ''
    });

    // Map numbers to strings for matching the region text field
    const REGION_MAP = {
        "15": "Arica", "1": "Tarapacá", "2": "Antofagasta", "3": "Atacama", "4": "Coquimbo",
        "5": "Valparaíso", "13": "Metropolitana", "6": "O'Higgins", "7": "Maule", "16": "Ñuble",
        "8": "Biobío", "9": "Araucanía", "14": "Los Ríos", "10": "Los Lagos", "11": "Aysén", "12": "Magallanes"
    };

    // Apply filters
    const filteredBids = submittedBids.filter(bid => {
        if (filters.region && filters.region !== '') {
            const rName = REGION_MAP[filters.region];
            if (rName) {
                // If it doesn't match the region text, hide it
                if (!bid.region || !bid.region.toLowerCase().includes(rName.toLowerCase())) {
                    return false;
                }
            }
        }
        if (filters.callNumber && String(bid.callNumber || 1) !== filters.callNumber) return false;
        return true;
    });

    // Calculate stats based on UNFILTERED data
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

    const handleSaveEdit = () => {
        if (onUpdateBid && editDraft.itemsData) {
            let finalProduct = 0;
            editDraft.itemsData.forEach(item => {
                finalProduct += item.totalFinalPrice || 0;
            });
            const sCost = Number(editDraft.shippingCost) || 0;
            const globalMargin = (Number(editDraft.margin) || 30) / 100;
            const finalShipping = Math.round(sCost * (1 + globalMargin));
            const total = finalProduct + finalShipping;

            onUpdateBid(selectedItem.id, editDraft, { finalProduct, finalShipping, total });
        }
        setIsEditing(false);
        setSelectedItem(null);
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

            {/* Filters Bar */}
            <div className="glass-panel" style={{ padding: '15px 20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Región:</label>
                    <select 
                        value={filters.region} 
                        onChange={e => setFilters(prev => ({...prev, region: e.target.value}))}
                        style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    >
                        <option value="">Todas las Regiones</option>
                        <option value="15">Arica y Parinacota</option>
                        <option value="1">Tarapacá</option>
                        <option value="2">Antofagasta</option>
                        <option value="3">Atacama</option>
                        <option value="4">Coquimbo</option>
                        <option value="5">Valparaíso</option>
                        <option value="13">Metropolitana de Santiago</option>
                        <option value="6">O'Higgins</option>
                        <option value="7">Maule</option>
                        <option value="16">Ñuble</option>
                        <option value="8">Biobío</option>
                        <option value="9">La Araucanía</option>
                        <option value="14">Los Ríos</option>
                        <option value="10">Los Lagos</option>
                        <option value="11">Aysén</option>
                        <option value="12">Magallanes</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Llamado:</label>
                    <select 
                        value={filters.callNumber} 
                        onChange={e => setFilters(prev => ({...prev, callNumber: e.target.value}))}
                        style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    >
                        <option value="">Todos</option>
                        <option value="1">Primer Llamado</option>
                        <option value="2">Segundo Llamado</option>
                    </select>
                </div>
            </div>

            {/* Lista de Licitaciones */}
            <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'white' }}>Detalle de Licitaciones</h3>
                    {filteredBids.length > 0 && (
                        <button 
                            onClick={async () => {
                                if (confirm('¿Estás seguro de que deseas borrar TODAS las licitaciones postuladas de este historial?')) {
                                    for (const b of filteredBids) {
                                        onDeleteBid(b);
                                        await new Promise(r => setTimeout(r, 100)); // Prevent SQLite DB lock
                                    }
                                }
                            }}
                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
                        >
                            <Trash2 size={14} /> Borrar Todo
                        </button>
                    )}
                </div>
                {filteredBids.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>No tienes licitaciones postuladas que coincidan con los filtros.</p>
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
                            {filteredBids.map((bid) => {
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
                                } else if (bid.biddedMargin) {
                                    realMargin = bid.biddedMargin;
                                }

                                return (
                                    <tr 
                                        key={bid.id} 
                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onClick={() => { setSelectedItem(bid); setIsEditing(false); }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '15px 10px', color: '#60a5fa', fontWeight: 'bold' }}>{bid.id}</td>
                                        <td style={{ padding: '15px 10px', color: 'var(--text-secondary)' }}>{bid.biddedDate || bid.submittedAt || 'N/A'}</td>
                                        <td style={{ padding: '15px 10px', color: 'white', fontWeight: 'bold' }}>${(bid.biddedPrice || 0).toLocaleString('es-CL')}</td>
                                        <td style={{ padding: '15px 10px', color: '#8b5cf6' }}>{realMargin}%</td>
                                        <td style={{ padding: '15px 10px' }} onClick={(e) => e.stopPropagation()}>
                                            <select 
                                                value={bid.bidStatus || 'postulada'}
                                                onChange={(e) => handleStatusChange(bid, e.target.value)}
                                                style={{ 
                                                    background: bid.bidStatus === 'ganada' ? 'rgba(16, 185, 129, 0.2)' : 
                                                               bid.bidStatus === 'perdida' ? 'rgba(239, 68, 68, 0.2)' : 
                                                               'rgba(59, 130, 246, 0.2)',
                                                    color: bid.bidStatus === 'ganada' ? '#10b981' : 
                                                           bid.bidStatus === 'perdida' ? '#fca5a5' : 
                                                           '#60a5fa',
                                                    border: 'none',
                                                    padding: '5px 10px',
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
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
                                                        finalProduct: draft?.productCost || 0,
                                                        finalShipping: draft?.shippingCost || 0,
                                                        total: bid.biddedPrice || 0
                                                    };
                                                    generatePDF(bid, draft, finalCalc);
                                                }}
                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                title="Descargar PDF"
                                            >
                                                <Download size={16} /> PDF
                                            </button>
                                        </td>
                                        <td style={{ padding: '15px 10px' }}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedItem(bid);
                                                    setEditDraft(bid.postulationDraft || {});
                                                    setIsEditing(true);
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
                    onClick={() => { setSelectedItem(null); setIsEditing(false); }}
                >
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => { setSelectedItem(null); setIsEditing(false); }} 
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            &times;
                        </button>
                        <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isEditing ? 'Editando Licitación:' : 'Detalle de Licitación:'} {selectedItem.id}
                            <button 
                                onClick={() => navigator.clipboard.writeText(selectedItem.id)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                                title="Copiar ID"
                            >
                                <Copy size={14} />
                            </button>
                        </h3>
                        <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>{selectedItem.name}</p>

                        {isEditing ? (
                            // Modo Edición
                            <>
                                <IntelligentWidget 
                                    tender={selectedItem} 
                                    onUpdateQuoter={(data) => setEditDraft(prev => ({ ...prev, ...data }))} 
                                />
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Truck size={18} color="#9ca3af" />
                                        <input 
                                            type="number" 
                                            placeholder="Costo de Despacho Global" 
                                            value={editDraft.shippingCost || ''}
                                            onChange={e => setEditDraft(prev => ({...prev, shippingCost: e.target.value}))}
                                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', width: '200px' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <h6 style={{ margin: '0 0 10px', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>📄 Datos Adicionales para PDF</h6>
                                    </div>
                                    <input type="text" placeholder="Destinatario / Cliente (Ej. Jardin Betty)" value={editDraft.pdfClientName || ''} onChange={e => setEditDraft(prev => ({...prev, pdfClientName: e.target.value}))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white' }} />
                                    <input type="text" placeholder="RUT Comprador (Ej. 70.072.600-2)" value={editDraft.pdfClientRut || ''} onChange={e => setEditDraft(prev => ({...prev, pdfClientRut: e.target.value}))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white' }} />
                                    <input type="text" placeholder="Lugar de Entrega (Ej. Población Sol...)" value={editDraft.pdfDeliveryPlace || ''} onChange={e => setEditDraft(prev => ({...prev, pdfDeliveryPlace: e.target.value}))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white', gridColumn: '1 / -1' }} />
                                    <input type="number" placeholder="Días de Entrega (Ej. 3)" value={editDraft.pdfDeliveryDays || ''} onChange={e => setEditDraft(prev => ({...prev, pdfDeliveryDays: e.target.value}))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #4b5563', background: 'rgba(0,0,0,0.5)', color: 'white' }} />
                                </div>
                                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        style={{ background: 'transparent', color: '#fca5a5', border: '1px solid #ef4444', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <X size={16} /> Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSaveEdit}
                                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <Save size={16} /> Guardar Cambios
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Modo Visualización
                            <>
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

                                <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button 
                                        onClick={(e) => {
                                            setEditDraft(selectedItem.postulationDraft || {});
                                            setIsEditing(true);
                                        }}
                                        style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Edit size={18} /> Editar Postulación
                                    </button>
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
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
