const puppeteerExtra = require('puppeteer-extra');
const StealthPluginLocal = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPluginLocal());
const fs = require('fs');

async function test() {
    const browser = await puppeteerExtra.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: 'new'
    });
    const page = await browser.newPage();
    
    // Set download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: __dirname,
    });

    console.log("Navigating...");
    await page.goto('https://buscador.mercadopublico.cl/ficha?code=1053139-67-COT26', { waitUntil: 'networkidle2' });
    console.log("Loaded Ficha.");
    
    // Find the download button for the attachment and click it
    // Wait for the modal or attachment list to load
    // Actually, on the ficha page, the attachments are listed under a tab or something?
    const html = await page.content();
    fs.writeFileSync('ficha.html', html);
    console.log("Saved ficha.html");
    
    await browser.close();
}
test();
