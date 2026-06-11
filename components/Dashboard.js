'use client';
import { useState, useEffect } from 'react';
import Filters from './Filters';
import DataTable from './DataTable';
import RefreshButton from './RefreshButton';
import DetailModal from './DetailModal';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    region: '',
    maxPrice: ''
  });

  const fetchData = async (currentPage = page, currentFilters = filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
          page: currentPage,
          region: currentFilters.region || '',
          search: currentFilters.search || '',
          status: currentFilters.status || ''
      });
      const res = await fetch(`/api/scrape?${query.toString()}`);
      const result = await res.json();
      
      setData(result.data || []);
      setTotalCount(result.totalCount || 0);
      
      if (!result.success) {
        setError(result.error || 'Error al conectar con el servidor de scraping.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor de scraping.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, filters);
  }, []);

  // Whenever filters change (except maxPrice), we reset page to 1 and fetch from backend
  useEffect(() => {
    setPage(1);
    // Debounce backend fetch slightly for typing search
    const timer = setTimeout(() => {
      fetchData(1, filters);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search, filters.region, filters.status]);

  // Local filtering for price and callNumber
  useEffect(() => {
    let result = data;
    if (filters.callNumber) {
      result = result.filter(item => item.callNumber === Number(filters.callNumber));
    }
    if (filters.maxPrice) {
      result = result.filter(item => item.price <= Number(filters.maxPrice));
    }
    setFilteredData(result);
  }, [data, filters.maxPrice, filters.callNumber]);

  const handleNextPage = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, filters);
  };

  const handlePrevPage = () => {
      if (page > 1) {
          const prevPage = page - 1;
          setPage(prevPage);
          fetchData(prevPage, filters);
      }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <RefreshButton onRefresh={() => fetchData(page, filters)} isLoading={isLoading} />
        {error && <span style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</span>}
      </div>
      
      <Filters filters={filters} setFilters={setFilters} />
      
      {isLoading ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Obteniendo página {page} en tiempo real a través de Web Scraping...</p>
        </div>
      ) : (
        <>
          <DataTable data={filteredData} onRowClick={setSelectedItem} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                 {totalCount > 0 ? `Mostrando ${filteredData.length} resultados en esta página (Total en sistema: ${totalCount})` : 'No se encontraron resultados.'}
             </span>
             <div style={{ display: 'flex', gap: '10px' }}>
                 <button 
                    onClick={handlePrevPage} 
                    disabled={page === 1 || isLoading}
                    style={{
                        padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', borderRadius: '8px', cursor: (page === 1 || isLoading) ? 'not-allowed' : 'pointer', opacity: (page === 1 || isLoading) ? 0.5 : 1
                    }}>
                     Anterior
                 </button>
                 <button 
                    onClick={handleNextPage} 
                    disabled={isLoading || data.length === 0}
                    style={{
                        padding: '8px 16px', background: 'var(--primary-color)', border: 'none',
                        color: 'white', borderRadius: '8px', cursor: (isLoading || data.length === 0) ? 'not-allowed' : 'pointer', opacity: (isLoading || data.length === 0) ? 0.5 : 1
                    }}>
                     Siguiente
                 </button>
             </div>
          </div>
        </>
      )}

      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
