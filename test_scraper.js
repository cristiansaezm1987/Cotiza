const cheerio = require('cheerio');

async function testDDG() {
  const query = 'site:articulo.mercadolibre.cl "toner 30a"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const results = [];
  $('.result').each((i, el) => {
    const title = $(el).find('.result__title').text().trim();
    const snippet = $(el).find('.result__snippet').text().trim();
    let link = $(el).find('.result__url').attr('href');
    
    // Duckduckgo wrapper sometimes has //duckduckgo.com/l/?uddg=
    if (link && link.includes('uddg=')) {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        link = decodeURIComponent(urlParams.get('uddg'));
    }

    if (title) {
        results.push({ title, snippet, link });
    }
  });
  
  console.log("Found:", results.length);
  console.log(results.slice(0, 3));
}

testDDG();
