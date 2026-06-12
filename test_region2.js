const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(stealth);

(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', r => {
    if(r.url().includes('api.buscador')) console.log('REQ:', r.url());
    r.continue();
  });
  
  await page.goto('https://buscador.mercadopublico.cl/compra-agil', {waitUntil: 'networkidle2'});
  
  await page.evaluate(async () => {
    // 1. Change region value manually in Angular state or just by firing events
    // Angular handles inputs by tracking "input" events
    const selects = document.querySelectorAll('select');
    let regionSelect;
    for(let s of selects) {
      if(s.getAttribute('formcontrolname') === 'region') regionSelect = s;
    }
    
    if(!regionSelect && selects.length > 1) regionSelect = selects[1];
    
    if(regionSelect) {
      regionSelect.value = '13';
      regionSelect.dispatchEvent(new Event('change', {bubbles: true}));
    }
    
    // Also try typing "computador" in the search box
    const inputs = document.querySelectorAll('input');
    if(inputs.length > 0) {
      inputs[0].value = 'computador';
      inputs[0].dispatchEvent(new Event('input', {bubbles: true}));
    }
    
    // Click submit button
    const btns = document.querySelectorAll('button');
    // Usually the search button is the first primary button
    if(btns.length > 0) btns[0].click();
  });
  
  await new Promise(r => setTimeout(r, 4000));
  process.exit(0);
})();
