import React, { useState, useEffect } from 'react';
import { Upload, Save, Building, Phone, Globe, CreditCard } from 'lucide-react';

export default function SettingsView() {
    const [profile, setProfile] = useState({
        logoUrl: '',
        companyName: '',
        website: '',
        phones: '',
        rut: ''
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const savedProfile = localStorage.getItem('companyProfile');
        if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
        }
    }, []);

    const handleChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('logoUrl', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        localStorage.setItem('companyProfile', JSON.stringify(profile));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div style={{ padding: '30px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }} className="animate-fade-in">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, color: 'white' }}>
                <Building size={24} /> Configuración de Empresa (Cotizaciones PDF)
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                Estos datos se usarán automáticamente para generar tus cotizaciones en PDF con un formato profesional.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                {/* Logo Section */}
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)' }}>Logo de la Empresa</h4>
                    <div style={{ 
                        width: '100%', height: '150px', background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '8px', border: '2px dashed rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '15px', overflow: 'hidden'
                    }}>
                        {profile.logoUrl ? (
                            <img src={profile.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Sin logo</span>
                        )}
                    </div>
                    <label style={{ 
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: 'white',
                        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
                    }}>
                        <Upload size={18} /> Subir Logo
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    </label>
                </div>

                {/* Info Section */}
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                            <Building size={16} /> Razón Social / Nombre Fantasía
                        </label>
                        <input 
                            type="text" 
                            value={profile.companyName}
                            onChange={(e) => handleChange('companyName', e.target.value)}
                            placeholder="Ej. Tecno Express"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '6px' }}
                        />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                <CreditCard size={16} /> RUT Empresa
                            </label>
                            <input 
                                type="text" 
                                value={profile.rut}
                                onChange={(e) => handleChange('rut', e.target.value)}
                                placeholder="Ej. 77.043.858-6"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '6px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                <Phone size={16} /> Teléfonos
                            </label>
                            <input 
                                type="text" 
                                value={profile.phones}
                                onChange={(e) => handleChange('phones', e.target.value)}
                                placeholder="Ej. +56 9 97913325"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '6px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                            <Globe size={16} /> Sitio Web o Dirección
                        </label>
                        <input 
                            type="text" 
                            value={profile.website}
                            onChange={(e) => handleChange('website', e.target.value)}
                            placeholder="Ej. Santiago - Chile | www.tecnoexpress.com"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '6px' }}
                        />
                    </div>
                    
                    <button 
                        onClick={handleSave}
                        style={{
                            marginTop: '10px', background: saved ? '#10b981' : 'linear-gradient(90deg, #10b981, #059669)',
                            color: 'white', border: 'none', padding: '12px', borderRadius: '8px',
                            fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                            cursor: 'pointer', transition: '0.2s'
                        }}
                    >
                        <Save size={18} /> {saved ? '¡Guardado correctamente!' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
        </div>
    );
}
