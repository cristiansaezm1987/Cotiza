const puppeteer = require('puppeteer');

async function test() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'domcontentloaded' });
    const cookies = await page.cookies();
    console.log("Cookies:", cookies);
    await browser.close();
}
test();
