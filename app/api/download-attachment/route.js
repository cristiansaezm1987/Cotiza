import { NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

export const maxDuration = 60;

export async function GET(request) {
  let browser;
  try {
    const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('id');
    const tenderCode = searchParams.get('code');
    const fileName = searchParams.get('name') || 'adjunto.pdf';

    if (!fileId || !tenderCode) {
      return NextResponse.json({ success: false, error: 'File ID and Tender Code are required' }, { status: 400 });
    }

    if (isVercel) {
      const puppeteerExtraVercel = addExtra(puppeteerCore);
      puppeteerExtraVercel.use(StealthPlugin());

      browser = await puppeteerExtraVercel.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'
        ),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      const puppeteerExtra = require('puppeteer-extra');
      const puppeteer = puppeteerExtra.default || puppeteerExtra;
      const StealthPluginLocal = require('puppeteer-extra-plugin-stealth');
      puppeteer.use(StealthPluginLocal());
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
      });
    }

    const page = await browser.newPage();
    let authHeaders = {};

    await page.setRequestInterception(true);
    
    page.on('request', interceptedRequest => {
        if (interceptedRequest.url().includes('listar') || interceptedRequest.url().includes('adjunto')) {
            const headers = interceptedRequest.headers();
            Object.assign(authHeaders, headers);
        }
        interceptedRequest.continue();
    });

    // Navigate to the Ficha page to establish session and steal headers
    try {
        await page.goto(`https://buscador.mercadopublico.cl/ficha?code=${tenderCode}`, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
        console.warn("Navigation timeout, proceeding...");
    }

    const extractText = searchParams.get('extractText') === 'true';

    // Now, fetch the file blob within the page context using the stolen headers
    const b64 = await page.evaluate(async (url, headers) => {
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }, `https://adjunto.mercadopublico.cl/adjunto-compra-agil/v1/adjuntos-compra-agil/descargar/${fileId}`, authHeaders);

    await browser.close();

    // Extract base64 string
    const base64Data = b64.split(',')[1];
    const mimeType = b64.split(';')[0].split(':')[1];

    const buffer = Buffer.from(base64Data, 'base64');

    if (extractText) {
        return NextResponse.json({ success: true, base64: base64Data, text: "PDF enviado como base64" });
    }

    return new NextResponse(buffer, {
        headers: {
            'Content-Type': mimeType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileName}"`
        }
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error('Download error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
