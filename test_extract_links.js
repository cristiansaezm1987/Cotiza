const fs = require('fs');
const html = fs.readFileSync('ficha.html', 'utf8');
const regex = /href="([^"]*descargar[^"]*)"/gi;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log(match[1]);
}
