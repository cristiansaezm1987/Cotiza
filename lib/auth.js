import fs from 'fs';
import path from 'path';

const HEADERS_FILE = path.join(process.cwd(), 'lib', 'mp-headers.json');

/**
 * Returns valid headers for Mercado Público APIs.
 * It caches them in a file to be shared across API routes.
 * If expired or missing, it launches Puppeteer to steal them.
 */
export async function getAuthHeaders() {
    // 1. Try to read from cache
    if (fs.existsSync(HEADERS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(HEADERS_FILE, 'utf8'));
            // Check if headers are younger than 5 minutes (Mercado Público sessions expire quickly)
            if (Date.now() - data.timestamp < 5 * 60 * 1000) {
                return data.headers;
            }
        } catch (e) {
            console.error('Error reading headers cache:', e);
        }
    }

    // 2. Cache is empty or expired, we need to steal new headers
    console.log('[Auth] Renovando tokens de Mercado Público...');
    let headersToSteal = null;
    let browser = null;
    
    try {
        const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
        
        if (isVercel) {
            const puppeteerCore = require('puppeteer-core');
            const chromium = require('@sparticuz/chromium-min');
            const { addExtra } = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            
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
        await page.setRequestInterception(true);
        
        page.on('request', interceptedRequest => {
            const url = interceptedRequest.url();
            if (url.includes('api.buscador.mercadopublico.cl/compra-agil') && interceptedRequest.method() !== 'OPTIONS' && !headersToSteal) {
                headersToSteal = interceptedRequest.headers();
            }
            interceptedRequest.continue();
        });

        // We just need the page to load enough to fire the initial API request
        await page.goto(`https://buscador.mercadopublico.cl/compra-agil`, { waitUntil: 'networkidle2' });
        await page.close();
        
        if (headersToSteal) {
            // Write to cache
            fs.writeFileSync(HEADERS_FILE, JSON.stringify({
                timestamp: Date.now(),
                headers: headersToSteal
            }));
            console.log('[Auth] Tokens renovados exitosamente.');
            return headersToSteal;
        } else {
            throw new Error('No se interceptaron las credenciales de Mercado Público.');
        }

    } catch (error) {
        console.error('[Auth] Error robando tokens:', error);
        throw error;
    } finally {
        if (browser) {
            try { await browser.close(); } catch(e){}
        }
    }
}
