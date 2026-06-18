async function testAPI() {
    const url = "https://api.mercadolibre.com/sites/MLC/search?q=toner%2030a";
    const res = await fetch(url);
    const json = await res.json();
    console.log("Status:", res.status);
    console.log("Results count:", json.results ? json.results.length : 0);
    if (json.results && json.results.length > 0) {
        console.log(json.results[0].title);
        console.log(json.results[0].price);
        console.log(json.results[0].permalink);
    } else {
        console.log(json);
    }
}
testAPI();
