const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(stealth);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle2'});
  
  await page.evaluate(async () => {
    const urls = [
      'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1&region=13',
      'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1&id_region=13',
      'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1&idRegion=13',
      'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1&regiones=13',
      'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1&regions=13',
      'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1'
    ];
    
    for (let u of urls) {
      try {
        const res = await fetch(u);
        const j = await res.json();
        console.log(u, '=>', j.payload ? j.payload.resultCount : 'No payload');
      } catch(e) {
        console.log(u, '=> ERROR:', e.message);
      }
    }
  });
  
  await new Promise(r => setTimeout(r, 5000));
  process.exit(0);
})();
