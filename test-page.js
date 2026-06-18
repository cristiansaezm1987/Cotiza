const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
(async () => {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();
    
    let headersToSteal = null;
    page.on('request', r => {
        if(r.url().includes('api.buscador.mercadopublico.cl/compra-agil') && r.method() !== 'OPTIONS' && !headersToSteal) {
            headersToSteal = r.headers();
        }
    });
    
    await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle2'});
    
    if(headersToSteal) {
        console.log('Got headers! Testing native node fetch...');
        const res = await fetch('https://api.buscador.mercadopublico.cl/compra-agil?date_from=2024-05-10&date_to=2024-05-15&order_by=recent&page_number=1', {
            headers: headersToSteal
        });
        const json = await res.json();
        console.log('Result:', json.payload ? json.payload.resultados.length : json);
    }
    await browser.close();
})();
