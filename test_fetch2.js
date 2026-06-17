const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

async function test() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: 'new'
    });
    const page = await browser.newPage();
    
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    
    const status = await page.evaluate(async () => {
        const url = "https://adjunto.mercadopublico.cl/adjunto-compra-agil/v1/adjuntos-compra-agil/descargar/222C97E0-67BB-4CB2-9F8A-2F8E2F1523D4";
        try {
            const res = await fetch(url, { 
                credentials: "omit",
                headers: {
                    "Accept": "application/json, text/plain, */*"
                }
            });
            return res.status;
        } catch(e) { return e.message; }
    });
    console.log("Status:", status);
    await browser.close();
}
test();
