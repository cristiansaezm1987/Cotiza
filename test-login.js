const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
puppeteer.use(stealth);

(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  
  await page.goto('https://www.mercadopublico.cl/', {waitUntil: 'networkidle2'});
  
  await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle2'}),
      page.click('button[onclick="keycloak.login()"]')
  ]);
  
  const claveUnicaBtn = await page.waitForSelector('#zocial-oidc', { timeout: 15000 });
  await Promise.all([
      page.waitForNavigation({waitUntil: 'networkidle2'}),
      claveUnicaBtn.click()
  ]);
  
  const url = page.url();
  console.log('Arrived at URL:', url);
  
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('claveunica_dump.html', html);
  console.log('Dumped claveunica html');
  
  process.exit(0);
})();
