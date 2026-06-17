async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/download-attachment?id=222C97E0-67BB-4CB2-9F8A-2F8E2F1523D4&code=1053139-67-COT26&extractText=true');
        const data = await res.json();
        console.log("Success:", data.success);
        console.log("Text length:", data.text ? data.text.length : 'undefined');
        if (data.text) {
            console.log("First 200 chars:\n", data.text.substring(0, 200));
        } else {
            console.log("Error:", data.error);
        }
    } catch (e) {
        console.error(e);
    }
}
test();
