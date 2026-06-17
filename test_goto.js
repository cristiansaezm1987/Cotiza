const puppeteer = require('puppeteer-core');

async function test() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: 'new'
    });
    const page = await browser.newPage();
    
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    
    page.on('response', async res => {
        if (res.url().includes('adjuntos-compra-agil/descargar/')) {
            console.log("Got response:", res.status());
            const buffer = await res.buffer();
            console.log("Buffer size:", buffer.length);
        }
    });

    try {
        await page.goto("https://adjunto.mercadopublico.cl/adjunto-compra-agil/v1/adjuntos-compra-agil/descargar/222C97E0-67BB-4CB2-9F8A-2F8E2F1523D4");
    } catch(e) {
        console.log("Goto error:", e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
}
test();
