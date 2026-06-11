import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow longer execution times

export async function GET(request) {
  const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  const stealth = StealthPlugin.default ? StealthPlugin.default() : StealthPlugin();

  let browser;
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get('page') || '1';
    const regionParam = searchParams.get('region') || '';
    const searchKeyword = searchParams.get('search') || '';
    const statusParam = searchParams.get('status') || '';
    
    console.log(`Starting Scrape. Page: ${pageParam}, Region: ${regionParam}, Status: ${statusParam}`);
    
    if (isVercel) {
      const puppeteerCore = require('puppeteer-core');
      const { addExtra } = require('puppeteer-extra');
      const chromium = require('@sparticuz/chromium-min');
      
      const puppeteerExtraVercel = addExtra(puppeteerCore);
      puppeteerExtraVercel.use(stealth);

      browser = await puppeteerExtraVercel.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
        ),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      const puppeteerExtra = require('puppeteer-extra');
      const puppeteer = puppeteerExtra.default || puppeteerExtra;
      puppeteer.use(stealth);
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
      });
    }

    const page = await browser.newPage();
    let interceptedData = null;
    let totalCount = 0;

    await page.setRequestInterception(true);
    
    page.on('request', interceptedRequest => {
        const url = interceptedRequest.url();
        if (url.includes('api.buscador.mercadopublico.cl/compra-agil?') && interceptedRequest.method() !== 'OPTIONS') {
            let newUrl = url;
            newUrl = newUrl.replace(/page_number=\d+/, `page_number=${pageParam}`);
            if (regionParam) newUrl += `&region=${regionParam}`;
            if (searchKeyword) newUrl += `&keywords=${encodeURIComponent(searchKeyword)}`;
            if (statusParam) newUrl = newUrl.replace(/status=\d+/, `status=${statusParam}`);
            
            console.log("Rewriting API URL to:", newUrl);
            interceptedRequest.continue({ url: newUrl });
        } else {
            interceptedRequest.continue();
        }
    });

    const responsePromise = new Promise(resolve => {
        page.on('response', async (response) => {
          const url = response.url();
          if (response.request().method() !== 'OPTIONS' && url.includes('api.buscador.mercadopublico.cl/compra-agil')) {
            try {
              const json = await response.json();
              if (json && json.payload && json.payload.resultados) {
                interceptedData = json.payload.resultados;
                totalCount = json.payload.resultCount || 0;
              }
            } catch (e) {
                console.error("Error parsing JSON:", e);
            } finally {
                // Resolve once we either successfully parse or fail to parse the API response
                resolve();
            }
          }
        });
    });

    page.goto('https://buscador.mercadopublico.cl/compra-agil').catch(e => console.error("Navigation error:", e));
    
    // Wait for the specific API response, with a maximum timeout
    await Promise.race([
        responsePromise,
        new Promise(r => setTimeout(r, 25000))
    ]);

    await browser.close();

    if (interceptedData) {
      let finalData = interceptedData;

      const formattedData = finalData.map(item => ({
        id: item.codigo,
        name: item.nombre,
        status: String(item.id_estado) || '',
        statusName: item.estado || 'Desconocido',
        date: item.fecha_publicacion,
        price: Number(item.monto_disponible_CLP) || Number(item.monto_estimado) || 0,
        organization: item.organismo,
        region: item.region || item.unidad || 'N/A', 
        deliveryDays: item.dias_entrega || 1,
        callNumber: item.estado_convocatoria === 2 ? 2 : 1
      }));

      return NextResponse.json({ success: true, data: formattedData, totalCount });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'No pudimos interceptar los datos.'
      });
    }

  } catch (error) {
    if (browser) await browser.close();
    console.error('Scraping error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
