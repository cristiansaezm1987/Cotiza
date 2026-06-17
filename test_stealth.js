const puppeteerExtra = require('puppeteer-extra');
const StealthPluginLocal = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPluginLocal());

async function test() {
    const browser = await puppeteerExtra.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: 'new'
    });
    const page = await browser.newPage();
    
    page.on('response', async res => {
        if (res.url().includes('adjuntos-compra-agil/descargar/')) {
            console.log("Got response:", res.status());
            if (res.status() === 200) {
                const buffer = await res.buffer();
                console.log("Buffer size:", buffer.length);
            }
        }
    });

    try {
        await page.goto("https://adjunto.mercadopublico.cl/adjunto-compra-agil/v1/adjuntos-compra-agil/descargar/222C97E0-67BB-4CB2-9F8A-2F8E2F1523D4", { waitUntil: 'networkidle2' });
    } catch(e) {
        console.log("Goto error:", e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
}
test();
