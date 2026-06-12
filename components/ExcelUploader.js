'use client';
import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExcelUploader({ onDataLoaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const processExcel = async (file) => {
    setIsProcessing(true);
    setFileInfo({ name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + ' MB' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get all rows as arrays
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Find the header row (the one containing 'ID' or 'Código')
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(20, rawRows.length); i++) {
        const row = rawRows[i];
        if (row && (row.includes('ID') || row.includes('Código') || row.includes('Nombre') || row.includes('Estado Convocatoria'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawRows[headerRowIndex];
      const dataRows = rawRows.slice(headerRowIndex + 1);

      // Transform data to match our API format
      const transformedData = dataRows.map(row => {
        // Helper to get value by header name
        const getVal = (possibleNames) => {
          for (let name of possibleNames) {
            const index = headers.findIndex(h => h && h.toString().toLowerCase().trim() === name.toLowerCase());
            if (index !== -1 && row[index] !== undefined && row[index] !== '') {
              return row[index];
            }
          }
          return '';
        };

        let callNum = 1;
        const estadoConvocatoria = getVal(['Estado Convocatoria', 'Llamado']).toString().toLowerCase();
        if (estadoConvocatoria.includes('segundo') || estadoConvocatoria.includes('2')) {
            callNum = 2;
        }

        const montoRaw = getVal(['Monto Disponible', 'Monto', 'Monto Estimado']);
        // Strip all non-numeric characters (dots, commas, currency symbols) since CLP doesn't use decimals
        const montoLimpio = typeof montoRaw === 'string' ? montoRaw.replace(/[^0-9]/g, '') : montoRaw;

        return {
          id: getVal(['ID', 'Código', 'Codigo']),
          name: getVal(['Nombre', 'Nombre Licitación']),
          date: getVal(['Fecha de Publicación', 'Fecha Publicación', 'Fecha Publicacion', 'Publicacion']),
          closeDate: getVal(['Fecha de cierre', 'Fecha Cierre', 'Cierre']),
          organization: getVal(['Organismo', 'Institución', 'Comprador']),
          region: getVal(['Región', 'Region', 'Unidad']) || 'No especificada', // Excel usually has Unidad, we can map it to region or leave default
          statusName: getVal(['Estado']),
          price: Number(montoLimpio || 0),
          currency: getVal(['Moneda']) || 'CLP',
          deliveryDays: getVal(['Días Entrega', 'Dias', 'Plazo']) || 'N/A',
          callNumber: callNum,
          _rawExcel: true
        };
      }).filter(item => item.id); // Filter out empty rows at the end

      onDataLoaded(transformedData);
    } catch (error) {
      console.error('Error procesando Excel:', error);
      alert('Hubo un error procesando el archivo Excel. Asegúrate de que sea el formato correcto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        processExcel(file);
      } else {
        alert('Por favor sube un archivo Excel (.xlsx, .xls, .csv)');
      }
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processExcel(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
        <FileSpreadsheet size={20} color="var(--success-color)" />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Modo Excel (Fuente 100% Verídica)</h2>
      </div>
      
      {!fileInfo ? (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--success-color)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: isDragging ? 'rgba(74, 222, 128, 0.05)' : 'transparent'
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleChange} 
            accept=".xlsx, .xls, .csv" 
            style={{ display: 'none' }} 
          />
          <UploadCloud size={48} color={isDragging ? 'var(--success-color)' : 'var(--text-secondary)'} style={{ margin: '0 auto 15px' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Arrastra el Excel Oficial de Mercado Público aquí</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>o haz clic para buscarlo en tu computador</p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {isProcessing ? (
               <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--success-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            ) : (
               <CheckCircle size={24} color="var(--success-color)" />
            )}
            <div>
              <p style={{ fontWeight: 500, margin: 0 }}>{fileInfo.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {isProcessing ? 'Procesando miles de registros...' : `Cargado con éxito (${fileInfo.size})`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setFileInfo(null);
              onDataLoaded(null);
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%' }}
            className="hover-bg-glass"
          >
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>
      )}
    </div>
  );
}
