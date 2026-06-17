const puppeteerExtra = require('puppeteer-extra');
const StealthPluginLocal = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPluginLocal());

async function test() {
    const browser = await puppeteerExtra.launch({
        headless: 'new'
    });
    const page = await browser.newPage();
    
    // Establish session
    await page.goto("https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26", { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Listen for download
    let buffer = null;
    page.on('response', async res => {
        if (res.url().includes('descargar')) {
            console.log("Download response status:", res.status());
            if (res.status() === 200) {
                try {
                    buffer = await res.buffer();
                    console.log("Got buffer of length:", buffer.length);
                } catch(e) { console.error("Error getting buffer", e); }
            }
        }
    });

    // Navigate to download directly instead of fetch
    try {
        await page.goto("https://adjunto.mercadopublico.cl/adjunto-compra-agil/v1/adjuntos-compra-agil/descargar/222C97E0-67BB-4CB2-9F8A-2F8E2F1523D4");
    } catch(e) {}
    
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
}
test();
