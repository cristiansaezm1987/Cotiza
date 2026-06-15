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
    const code = searchParams.get('id');

    if (!code) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
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
    let interceptedData = null;
    let adjuntosData = null;

    await page.setRequestInterception(true);
    
    page.on('request', interceptedRequest => {
        interceptedRequest.continue();
    });

    const responsePromise = new Promise(resolve => {
        let fichaReceived = false;
        let adjuntosReceived = false;
        let fallbackTimeout = null;
        
        const checkDone = () => {
            if (fichaReceived && adjuntosReceived) {
                if (fallbackTimeout) clearTimeout(fallbackTimeout);
                resolve();
            }
        };

        page.on('response', async (response) => {
          const url = response.url();
          if (response.request().method() !== 'OPTIONS') {
            if (url.includes('action=ficha') && url.includes(code)) {
              try {
                const json = await response.json();
                if (json && json.payload) {
                  interceptedData = json.payload;
                }
              } catch (e) {
                  console.error("Error parsing ficha JSON:", e);
              } finally {
                  fichaReceived = true;
                  if (!fallbackTimeout) fallbackTimeout = setTimeout(resolve, 3000);
                  checkDone();
              }
            }
            if (url.includes('adjuntos-compra-agil/listar') && url.includes(code)) {
              try {
                const json = await response.json();
                if (json && json.payload && json.payload.files) {
                  adjuntosData = json.payload.files;
                }
              } catch (e) {
                  console.error("Error parsing adjuntos JSON:", e);
              } finally {
                  adjuntosReceived = true;
                  checkDone();
              }
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
      interceptedData.adjuntos = adjuntosData || [];
      return NextResponse.json({ success: true, data: interceptedData });
    } else {
      return NextResponse.json({ success: false, error: 'No pudimos interceptar los detalles.' }, { status: 500 });
    }

  } catch (error) {
    if (browser) await browser.close();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
