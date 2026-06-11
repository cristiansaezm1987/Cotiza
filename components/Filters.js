import { Search, Filter, Calendar } from 'lucide-react';

export default function Filters({ filters, setFilters }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Filter size={20} color="var(--accent-color)" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Filtros Avanzados</h2>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div>
          <label className="input-label">Búsqueda por Palabras Clave o ID</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              name="search"
              value={filters.search}
              onChange={handleChange}
              className="input-field" 
              placeholder="Ej. Computadores, 105432-1..." 
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="input-label">Estado</label>
          <select name="status" value={filters.status} onChange={handleChange} className="input-field" style={{ appearance: 'none' }}>
            <option value="">Todos los Estados</option>
            <option value="2">Publicada</option>
            <option value="3">Cerrada</option>
            <option value="4">Proveedor seleccionado (Adjudicada)</option>
            <option value="5">Cancelada</option>
            <option value="6">Desierta</option>
          </select>
        </div>



        <div>
          <label className="input-label">Región</label>
          <select name="region" value={filters.region} onChange={handleChange} className="input-field" style={{ appearance: 'none' }}>
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

        <div>
          <label className="input-label">Precio Máximo ($)</label>
          <input 
            type="number" 
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleChange}
            className="input-field" 
            placeholder="Sin límite" 
          />
        </div>
      </div>
    </div>
  );
}
