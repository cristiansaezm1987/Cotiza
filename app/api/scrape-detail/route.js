import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('id');

  if (!code) {
    return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    });

    const page = await browser.newPage();
    let interceptedData = null;

    await page.setRequestInterception(true);
    
    page.on('request', interceptedRequest => {
        interceptedRequest.continue();
    });

    const responsePromise = new Promise(resolve => {
        page.on('response', async (response) => {
          const url = response.url();
          if (response.request().method() !== 'OPTIONS' && url.includes('action=ficha') && url.includes(code)) {
            try {
              const json = await response.json();
              if (json && json.payload) {
                interceptedData = json.payload;
              }
            } catch (e) {
                console.error("Error parsing JSON:", e);
            } finally {
                resolve();
            }
          }
        });
    });

    // The Ficha page triggers the action=ficha API call
    page.goto(`https://buscador.mercadopublico.cl/ficha?code=${code}`).catch(e => console.error("Navigation error:", e));
    
    await Promise.race([
        responsePromise,
        new Promise(r => setTimeout(r, 20000))
    ]);

    await browser.close();

    if (interceptedData) {
      return NextResponse.json({ success: true, data: interceptedData });
    } else {
      return NextResponse.json({ success: false, error: 'No pudimos interceptar los detalles.' }, { status: 500 });
    }

  } catch (error) {
    if (browser) await browser.close();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
