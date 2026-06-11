import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow longer execution times

export async function GET(request) {
  const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  const stealth = StealthPlugin.default ? StealthPlugin.default() : StealthPlugin();

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('id');

  if (!code) {
    return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
  }

  let browser;
  try {
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
