const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function test() {
  console.log("Launching...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  console.log("Navigating...");
  await page.goto('https://buscador.mercadopublico.cl/compra-agil', { waitUntil: 'networkidle2' });
  
  console.log("Fetching API from within browser...");
  const data = await page.evaluate(async () => {
      const res = await fetch('https://api.buscador.mercadopublico.cl/compra-agil?page_number=1');
      return await res.json();
  });
  
  console.log("Data:", data.payload.resultados.length, "items");
  
  await browser.close();
}
test();
