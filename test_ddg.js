const cheerio = require('cheerio');

async function test() {
  const r = await fetch('https://html.duckduckgo.com/html/?q=site:articulo.mercadolibre.cl+computador', {headers: {'User-Agent': 'Mozilla/5.0'}});
  const html = await r.text();
  const $ = cheerio.load(html);
  const results = [];
  $('.result__body').each((i, el) => {
    const title = $(el).find('.result__title a').text();
    const url = $(el).find('.result__snippet').attr('href') || $(el).find('.result__url').attr('href');
    const snippet = $(el).find('.result__snippet').text();
    results.push({title, url, snippet});
  });
  console.log(results.slice(0,3));
}
test();
