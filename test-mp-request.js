const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.url().includes('compra-agil')) {
            console.log("URL:", request.url(), "METHOD:", request.method());
            if (request.postData()) console.log("POST DATA:", request.postData());
        }
        request.continue();
    });

    await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle2'});
    await browser.close();
})();
