const puppeteer = require('puppeteer-core');
async function test() {
    const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'domcontentloaded' });
    const cookies = await page.cookies();
    console.log(JSON.stringify(cookies, null, 2));
    await browser.close();
}
test();
