const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('compra-agil?')) {
            const json = await response.json();
            fs.writeFileSync('real_data.json', JSON.stringify(json.payload.resultados, null, 2));
        }
    });
    
    await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
