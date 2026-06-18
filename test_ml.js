const cheerio = require('cheerio');
async function testML() {
    const url = "https://listado.mercadolibre.cl/toner-30a";
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const results = [];
    $('.ui-search-result__wrapper').each((i, el) => {
        const title = $(el).find('.ui-search-item__title').text().trim();
        const priceStr = $(el).find('.andes-money-amount__fraction').first().text().trim();
        const link = $(el).find('.ui-search-link').attr('href');
        if (title && link) {
            results.push({title, priceStr, link});
        }
    });
    console.log("Found:", results.length);
    console.log(results.slice(0, 3));
}
testML();
