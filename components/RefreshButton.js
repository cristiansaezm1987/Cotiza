import { RefreshCw } from 'lucide-react';

export default function RefreshButton({ onRefresh, isLoading }) {
  return (
    <button 
      className="btn-primary animate-fade-in" 
      onClick={onRefresh} 
      disabled={isLoading}
      style={{ alignSelf: 'flex-start' }}
    >
      <RefreshCw size={18} className={isLoading ? 'spinner' : ''} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
      {isLoading ? 'Obteniendo Datos (Web Scraping)...' : 'Refrescar Datos Históricos'}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </button>
  );
}
