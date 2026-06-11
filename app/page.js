'use client';

import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <header className="animate-fade-in" style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Mercado Público Intelligence
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Plataforma de visualización en tiempo real para Compras Ágiles
        </p>
      </header>

      <Dashboard />
    </main>
  );
}
