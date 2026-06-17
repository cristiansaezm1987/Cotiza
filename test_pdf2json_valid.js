const PDFDocument = require('pdfkit');
const fs = require('fs');
const PDFParser = require('pdf2json');

async function test() {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream('test_generated.pdf'));
    doc.text('This is a test PDF. The capacity is 2TB and 7200 RPM SATA.');
    doc.end();

    await new Promise(r => setTimeout(r, 1000));

    const pdfParser = new PDFParser(null, 1);
    pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
    pdfParser.on('pdfParser_dataReady', pdfData => {
        console.log("Extracted:", pdfParser.getRawTextContent());
    });
    pdfParser.loadPDF('test_generated.pdf');
}
test();
