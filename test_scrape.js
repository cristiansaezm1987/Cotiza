async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/scrape-detail?id=1053139-67-COT26');
        const data = await res.json();
        console.log(JSON.stringify(data.data.adjuntos, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
