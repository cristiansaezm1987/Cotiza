const puppeteer = require('puppeteer');

async function test() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    let count = 0;
    
    await page.setRequestInterception(true);
    page.on('request', req => {
        const url = req.url();
        console.log("Request:", url);
        if (url.includes('mercadopublico.cl') && url.includes('/api/')) {
            count++;
        }
        req.continue();
    });
    
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 5000));
    console.log("Found API requests:", count);
    await browser.close();
}
test();
