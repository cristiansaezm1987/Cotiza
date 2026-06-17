const cheerio = require('cheerio');
fetch('https://listado.mercadolibre.cl/tablet', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  }
}).then(r=>r.text()).then(html=>{
  const $ = cheerio.load(html);
  console.log('Layout Items:', $('.ui-search-layout__item').length);
  console.log('Poly Cards:', $('.poly-card').length);
  console.log('li.ui-search-layout__item:', $('li.ui-search-layout__item').length);
  
  const fs = require('fs');
  fs.writeFileSync('test.html', html);
  console.log('HTML saved to test.html');
});
