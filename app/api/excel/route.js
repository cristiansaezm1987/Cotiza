import { NextResponse } from 'next/server';
import { openDB } from '../../../lib/db';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import os from 'os';
import { updateStatus } from '@/lib/status';

puppeteer.use(StealthPlugin());

export async function GET(req) {
  let browser;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excel-download-'));
  
  try {
    updateStatus('excel', { active: true, progress: 0, message: 'Iniciando navegador para Excel...' });
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: tempDir,
      eventsEnabled: true
    });
    
    const downloadPromise = new Promise((resolve, reject) => {
      let downloadId = null;
      client.on('Browser.downloadWillBegin', e => {
        downloadId = e.guid;
      });
      client.on('Browser.downloadProgress', e => {
        if (e.state === 'completed') {
          resolve();
        } else if (e.state === 'canceled') {
          reject(new Error('Download canceled'));
        }
      });
      setTimeout(() => reject(new Error('Download timeout')), 45000); // 45s timeout
    });

    updateStatus('excel', { progress: 20, message: 'Navegando y solicitando Excel...' });
    await page.goto('https://buscador.mercadopublico.cl/compra-agil', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button, span'));
      const btn = els.find(el => el.innerText && el.innerText.toLowerCase().includes('excel'));
      if(btn) btn.click();
    });

    await downloadPromise;
    updateStatus('excel', { progress: 60, message: 'Archivo descargado, procesando datos...' });
    
    // Find the downloaded file
    const files = fs.readdirSync(tempDir);
    const excelFile = files.find(f => f.endsWith('.xlsx'));
    
    if (!excelFile) {
      throw new Error('Excel file not found after download');
    }
    
    const filePath = path.join(tempDir, excelFile);
    
    let workbook;
    for (let i = 0; i < 10; i++) {
      try {
        const buffer = fs.readFileSync(filePath);
        workbook = XLSX.read(buffer, { type: 'buffer' });
        break;
      } catch (e) {
        if (i === 9) throw new Error(`Could not read file after 10 retries: ${e.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(20, rawRows.length); i++) {
      const row = rawRows[i];
      if (row && (row.includes('ID') || row.includes('Código') || row.includes('Nombre') || row.includes('Estado Convocatoria'))) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = rawRows[headerRowIndex];
    console.log("EXCEL HEADERS FOUND:", headers);
    const dataRows = rawRows.slice(headerRowIndex + 1);
    console.log("FIRST DATA ROW:", dataRows[0]);

    const transformedData = dataRows.map(row => {
      const getVal = (possibleNames) => {
        for (let name of possibleNames) {
          const index = headers.findIndex(h => h && h.toString().toLowerCase().trim() === name.toLowerCase());
          if (index !== -1 && row[index] !== undefined && row[index] !== '') {
            return row[index];
          }
        }
        return '';
      };

      const montoRaw = getVal(['Monto Disponible', 'Monto', 'Monto Estimado']);
      const montoLimpio = typeof montoRaw === 'string' ? montoRaw.replace(/[^0-9]/g, '') : montoRaw;

      const callNumStr = getVal(['Llamado', 'Nro Llamado', 'Nro', 'Estado Convocatoria']);
      const strLower = callNumStr ? callNumStr.toString().toLowerCase() : '';
      const callNum = (strLower.includes('2') || strLower.includes('segundo')) ? 2 : 1;
      
      return {
        id: getVal(['ID', 'Codigo Licitacion', 'Codigo', 'Número']),
        name: getVal(['Nombre', 'Descripción', 'Nombre Licitación']),
        date: getVal(['Fecha de Publicación', 'Fecha Publicación', 'Fecha Publicacion', 'Publicacion', 'Fecha de Publicacin']),
        closeDate: getVal(['Fecha de cierre', 'Fecha Cierre', 'Cierre']),
        organization: getVal(['Organismo', 'Institución', 'Comprador']),
        region: getVal(['Región', 'Region', 'Unidad']) || 'No especificada',
        statusName: getVal(['Estado']),
        price: Number(montoLimpio || 0),
        currency: getVal(['Moneda']) || 'CLP',
        deliveryDays: getVal(['Días Entrega', 'Dias', 'Plazo']) || 'N/A',
        callNumber: callNum,
        _rawExcel: true
      };
    }).filter(item => item.id);

    const db = await openDB();
    const now = new Date().toISOString();
    updateStatus('excel', { active: true, progress: 80, message: 'Guardando datos en Turso...' });

    const chunkSize = 100;
    for (let i = 0; i < transformedData.length; i += chunkSize) {
      const chunk = transformedData.slice(i, i + chunkSize);
      
      const sql = `
          INSERT INTO tenders (
            id, name, status, statusName, date, price, organization, region, closeDate, deliveryDays, callNumber, lastUpdated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            statusName=excluded.statusName,
            price=excluded.price,
            lastUpdated=excluded.lastUpdated,
            callNumber=excluded.callNumber
      `;

      if (db.client && typeof db.client.batch === 'function') {
        const statements = chunk.map(item => ({
          sql,
          args: [
            item.id, item.name || '', '', item.statusName || '', item.date || '', item.price || 0,
            item.organization || '', item.region || '', item.closeDate || '', item.deliveryDays || '', item.callNumber, now
          ]
        }));
        await db.client.batch(statements, 'write');
      } else {
        for (const item of chunk) {
          await db.run(sql, [
            item.id, item.name || '', '', item.statusName || '', item.date || '', item.price || 0,
            item.organization || '', item.region || '', item.closeDate || '', item.deliveryDays || '', item.callNumber, now
          ]);
        }
      }
      
      updateStatus('excel', { active: true, progress: 80 + Math.floor((i / transformedData.length) * 19), message: `Guardando datos en Turso... ${Math.min(i + chunkSize, transformedData.length)}/${transformedData.length}` });
    }

    updateStatus('excel', { active: false, progress: 100, message: 'Descarga de Excel completada y datos guardados.' });
    // Return count instead of 8000 rows to save memory
    return NextResponse.json({ success: true, count: transformedData.length });

  } catch (error) {
    console.error('Excel Download Error:', error);
    updateStatus('excel', { active: false, progress: 0, message: 'Error en la descarga.' });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch(e) {}
  }
}
