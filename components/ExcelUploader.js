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
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      // Transform data to match our API format
      const transformedData = jsonData.map(row => {
        let callNum = 1;
        const estadoConvocatoria = (row['Estado Convocatoria'] || '').toString().toLowerCase();
        if (estadoConvocatoria.includes('segundo') || estadoConvocatoria.includes('2')) {
            callNum = 2;
        }

        return {
          id_interno: Math.random().toString(), // fake ID
          codigo: row['ID'] || '',
          nombre: row['Nombre'] || row['Nombre Licitación'] || '',
          fecha_publicacion: row['Fecha de Publicación'] || row['Fecha Publicacion'] || '',
          fecha_cierre: row['Fecha de cierre'] || row['Fecha Cierre'] || '',
          organismo: row['Organismo'] || '',
          unidad: row['Unidad'] || '',
          estado: row['Estado'] || '',
          monto_disponible_CLP: Number(row['Monto Disponible'] || 0),
          moneda: row['Moneda'] || 'CLP',
          callNumber: callNum,
          _rawExcel: true
        };
      });

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
