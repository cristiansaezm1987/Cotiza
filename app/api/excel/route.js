import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import os from 'os';

puppeteer.use(StealthPlugin());

export async function GET(req) {
  let browser;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excel-download-'));
  
  try {
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

    await page.goto('https://buscador.mercadopublico.cl/compra-agil', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, button, span'));
      const btn = els.find(el => el.innerText && el.innerText.toLowerCase().includes('excel'));
      if(btn) btn.click();
    });

    await downloadPromise;
    
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
    const dataRows = rawRows.slice(headerRowIndex + 1);

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

      let callNum = 1;
      const estadoConvocatoria = getVal(['Estado Convocatoria', 'Llamado']).toString().toLowerCase();
      if (estadoConvocatoria.includes('segundo') || estadoConvocatoria.includes('2')) {
          callNum = 2;
      }

      const montoRaw = getVal(['Monto Disponible', 'Monto', 'Monto Estimado']);
      const montoLimpio = typeof montoRaw === 'string' ? montoRaw.replace(/[^0-9]/g, '') : montoRaw;

      return {
        id: getVal(['ID', 'Código', 'Codigo']),
        name: getVal(['Nombre', 'Nombre Licitación']),
        date: getVal(['Fecha de Publicación', 'Fecha Publicación', 'Fecha Publicacion', 'Publicacion']),
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

    return NextResponse.json({ success: true, data: transformedData });

  } catch (error) {
    console.error('Excel Download Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch(e) {}
  }
}
