const puppeteer = require('puppeteer-core');
async function test() {
    const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    const status = await page.evaluate(async () => {
        try {
            const res = await fetch("https://adjunto.mercadopublico.cl/adjunto-compra-agil/v1/adjuntos-compra-agil/descargar/222C97E0-67BB-4CB2-9F8A-2F8E2F1523D4", { 
                headers: { "Referer": "https://buscador.mercadopublico.cl/" }
            });
            return res.status;
        } catch(e) { return e.message; }
    });
    console.log("Status with Referer:", status);
    await browser.close();
}
test();
