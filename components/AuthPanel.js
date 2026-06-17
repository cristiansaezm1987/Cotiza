'use client';
import React, { useState } from 'react';
import { Lock, LogIn, CheckCircle, ShieldAlert, Building2 } from 'lucide-react';

export default function AuthPanel({ onSuccess }) {
  const [step, setStep] = useState(1); // 1: Login, 2: 2FA, 3: Company
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [wsEndpoint, setWsEndpoint] = useState(null);
  
  // Forms
  const [credentials, setCredentials] = useState({ run: '', password: '' });
  const [code, setCode] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (data.success) {
        setWsEndpoint(data.wsEndpoint);
        setStep(2);
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el robot local');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, wsEndpoint })
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies || []);
        if (data.companies && data.companies.length > 0) {
           setSelectedCompany(data.companies[0].id);
        }
        setStep(3);
      } else {
        setError(data.error || 'Código incorrecto o expirado');
      }
    } catch (err) {
      setError('Error verificando el código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCompany = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/select-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedCompany, wsEndpoint })
      });
      const data = await res.json();
      if (data.success) {
        setStep(4); // 4 = Success/Connected
        if (onSuccess) onSuccess(); // Notify parent
      } else {
        setError(data.error || 'Error al seleccionar empresa');
      }
    } catch (err) {
      setError('Error al confirmar empresa');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 4) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '20px', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle color="#10b981" />
          <h3 style={{ color: '#10b981', margin: 0 }}>Conectado a Mercado Público</h3>
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          El robot está listo para cotizar automáticamente en tu nombre.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <Lock color="var(--accent-color)" />
        <h3 style={{ margin: 0 }}>Conectar con Mercado Público</h3>
      </div>
      
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleLogin} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>RUN (Ej: 12345678-9)</label>
            <input 
              type="text" 
              className="glass-input" 
              style={{ width: '100%', padding: '10px' }}
              value={credentials.run}
              onChange={e => setCredentials({...credentials, run: e.target.value})}
              required
              disabled={isLoading}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>ClaveÚnica</label>
            <input 
              type="password" 
              className="glass-input" 
              style={{ width: '100%', padding: '10px' }}
              value={credentials.password}
              onChange={e => setCredentials({...credentials, password: e.target.value})}
              required
              disabled={isLoading}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="glass-button" disabled={isLoading} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLoading ? 'Conectando...' : <><LogIn size={18} /> Iniciar Sesión</>}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerify} className="animate-fade-in" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <ShieldAlert color="#f59e0b" size={24} />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#f59e0b' }}>Código de Validación (2FA)</label>
            <input 
              type="text" 
              className="glass-input" 
              style={{ width: '100%', padding: '10px', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              placeholder="Ingresa el código que recibiste"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="glass-button" disabled={isLoading} style={{ padding: '10px 20px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              {isLoading ? 'Verificando...' : 'Verificar Código'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSelectCompany} className="animate-fade-in" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Building2 color="var(--accent-color)" size={24} />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Selecciona la Empresa para operar</label>
            <select 
              className="glass-input" 
              style={{ width: '100%', padding: '10px' }}
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              disabled={isLoading}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="glass-button" disabled={isLoading} style={{ padding: '10px 20px' }}>
              {isLoading ? 'Guardando...' : 'Confirmar Empresa'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
