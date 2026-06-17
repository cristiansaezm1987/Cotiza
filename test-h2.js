const cheerio = require('cheerio');
const html = require('fs').readFileSync('test_puppeteer.html', 'utf-8');
const $ = cheerio.load(html);

console.log("Total h2 tags:", $('h2').length);

const results = [];
$('h2').each((i, el) => {
    // If this h2 is inside a container with a link
    const container = $(el).closest('a').length > 0 ? $(el).closest('a').parent() : $(el).parent();
    const title = $(el).text().trim();
    
    // ML often wraps title in an <a> tag and price is nearby
    const permalink = $(el).closest('a').attr('href') || container.find('a').attr('href');
    
    let priceStr = container.find('.andes-money-amount__fraction').first().text().replace(/\D/g, '');
    if (!priceStr) {
       // Search broader container
       priceStr = $(el).closest('li, div').find('.andes-money-amount__fraction').first().text().replace(/\D/g, '');
    }

    if (title && priceStr) {
        results.push({title, price: priceStr, permalink: permalink?.substring(0,50)});
    }
});

console.log(results.slice(0, 3));
