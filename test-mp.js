const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();
    await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle2'});
    
    // get all inputs
    const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(i => ({
            id: i.id,
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            className: i.className
        }));
    });
    console.log("INPUTS:", inputs);
    
    // get all buttons
    const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => ({
            id: b.id,
            innerText: b.innerText,
            className: b.className
        }));
    });
    console.log("BUTTONS:", buttons);
    
    await browser.close();
})();
