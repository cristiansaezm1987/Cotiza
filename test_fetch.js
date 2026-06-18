const cloudscraper = require('cloudscraper');

async function test() {
  try {
    const url = 'https://api.buscador.mercadopublico.cl/compra-agil?page_number=1';
    const response = await cloudscraper.get(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    console.log("Success! Data preview:", response.substring(0, 200));
  } catch (e) {
    console.log("Failed:", e.message);
  }
}
test();
