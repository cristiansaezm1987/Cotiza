const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

async function test() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: 'new'
    });
    const page = await browser.newPage();
    let authHeaders = {};
    
    await page.setRequestInterception(true);
    page.on('request', req => {
        const url = req.url();
        if (url.includes('mercadopublico.cl') && url.includes('/api/')) {
            const h = req.headers();
            if (h['authorization'] || h['Authorization']) {
                authHeaders = h;
                console.log("Got Auth header on:", url);
            }
        }
        req.continue();
    });
    
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'networkidle2' });
    console.log("Headers:", JSON.stringify(authHeaders, null, 2));
    await browser.close();
}
test();
