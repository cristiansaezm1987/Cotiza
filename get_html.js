const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle0'});
    const html = await page.content();
    fs.writeFileSync('page_content.html', html);
    await browser.close();
})();
