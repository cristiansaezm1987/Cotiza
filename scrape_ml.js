const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

puppeteer.launch({headless: 'new'}).then(async b => { 
    const p = await b.newPage(); 
    await p.goto('https://listado.mercadolibre.cl/computador', {waitUntil: 'networkidle2'}); 
    
    const results = await p.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.ui-search-layout__item'));
        return items.slice(0, 20).map(el => {
            const titleEl = el.querySelector('h2');
            const priceEl = el.querySelector('.andes-money-amount__fraction');
            const linkEl = el.querySelector('a.ui-search-item__group__element');
            const imgEl = el.querySelector('img.ui-search-result-image__image');
            
            return {
                title: titleEl ? titleEl.innerText : '',
                price: priceEl ? Number(priceEl.innerText.replace(/\./g, '')) : 0,
                url: linkEl ? linkEl.href : '',
                thumbnail: imgEl ? imgEl.src : ''
            };
        });
    });
    
    console.log(JSON.stringify(results, null, 2));
    await b.close(); 
});
