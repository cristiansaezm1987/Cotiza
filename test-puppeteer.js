const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://listado.mercadolibre.cl/impresora-hp', { waitUntil: 'networkidle2' });
  const html = await page.content();
  console.log(html.includes('ui-search-result__content') ? 'SUCCESS' : html.substring(0, 500));
  await browser.close();
})();
