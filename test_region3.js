const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    let targetParam = process.argv[2] || 'region=13';
    
    page.on('request', r => {
        if(r.url() === 'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1') {
            r.continue({url: `https://api.buscador.mercadopublico.cl/compra-agil?page_number=1&${targetParam}`});
        } else r.continue();
    });

    page.on('response', async res => {
        if (res.url().includes('api.buscador.mercadopublico.cl/compra-agil') && res.request().method() !== 'OPTIONS') {
            try {
                const j = await res.json();
                console.log(targetParam, 'COUNT:', j.payload.resultCount);
                process.exit(0);
            } catch(e) {}
        }
    });
    
    await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 6000));
    console.log(targetParam, 'TIMEOUT');
    process.exit(0);
})();
