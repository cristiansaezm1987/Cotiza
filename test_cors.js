async function test() {
    const res = await fetch("https://adjunto.mercadopublico.cl/adjunto-compra-agil/v1/adjuntos-compra-agil/descargar/222C97E0-67BB-4CB2-9F8A-2F8E2F1523D4", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    console.log("Headers:");
    for (const [key, value] of res.headers.entries()) {
        console.log(`${key}: ${value}`);
    }
}
test();
