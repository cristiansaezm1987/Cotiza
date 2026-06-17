import React, { useState } from 'react';
import { Lock, User, Building2, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function MercadoPublicoAuthModal({ onClose, onSuccess }) {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyRut, setCompanyRut] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState(1); // 1: Login, 2: Select Company, 3: Success

  const handleLogin = (e) => {
    e.preventDefault();
    setIsConnecting(true);
    // Simular tiempo de conexión a Mercado Público
    setTimeout(() => {
      setIsConnecting(false);
      setStep(2);
    }, 1500);
  };

  const handleSelectCompany = (e) => {
    e.preventDefault();
    if (!companyName || !companyRut) return;
    setIsConnecting(true);
    
    // Simular tiempo de selección de empresa
    setTimeout(() => {
      setIsConnecting(false);
      setStep(3);
      
      const selectedCompanyData = { id: 'custom', name: companyName, rut: companyRut };
      
      // Pasar datos al componente padre tras un breve éxito visual
      setTimeout(() => {
        onSuccess({ rut, company: selectedCompanyData });
      }, 1000);
      
    }, 1200);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e1e2f', width: '100%', maxWidth: '450px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        <div style={{ background: 'linear-gradient(to right, #004e92, #000428)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'white', padding: '6px', borderRadius: '8px' }}>
              <ShieldCheck size={24} color="#004e92" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 600 }}>Mercado Público</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Conexión Segura</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.7 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '30px' }}>
          {step === 1 && (
            <form onSubmit={handleLogin} className="animate-fade-in">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
                Para inyectar la oferta, necesitamos autenticarnos en tu portal de Mercado Público.
              </p>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>RUT Usuario</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    value={rut} 
                    onChange={e => setRut(e.target.value)} 
                    placeholder="12.345.678-9"
                    required
                    className="glass-input" 
                    style={{ width: '100%', padding: '10px 10px 10px 40px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                    className="glass-input" 
                    style={{ width: '100%', padding: '10px 10px 10px 40px' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isConnecting}
                className="glass-button primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', background: '#3b82f6', borderColor: '#2563eb', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
              >
                {isConnecting ? (
                  <>
                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Conectando con Servidores...
                  </>
                ) : 'Iniciar Sesión'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSelectCompany} className="animate-fade-in">
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ width: '50px', height: '50px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                  <CheckCircle2 size={28} color="#10b981" />
                </div>
                <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '5px' }}>¡Login Exitoso!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ingresa los datos de la empresa con la cual vas a registrar esta oferta.</p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Razón Social de tu Empresa</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    value={companyName} 
                    onChange={e => setCompanyName(e.target.value)} 
                    placeholder="Ej: Inversiones y Servicios SpA"
                    required
                    className="glass-input" 
                    style={{ width: '100%', padding: '10px 10px 10px 40px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>RUT de la Empresa</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    value={companyRut} 
                    onChange={e => setCompanyRut(e.target.value)} 
                    placeholder="76.123.456-7"
                    required
                    className="glass-input" 
                    style={{ width: '100%', padding: '10px 10px 10px 40px' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isConnecting}
                className="glass-button primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', background: '#10b981', borderColor: '#059669', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
              >
                {isConnecting ? (
                  <>
                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Vinculando...
                  </>
                ) : 'Continuar y Operar'}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '60px', height: '60px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                <CheckCircle2 size={32} color="white" />
              </div>
              <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '10px' }}>¡Conexión Establecida!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>El robot ahora tiene acceso para inyectar la cotización.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
