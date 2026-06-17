import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const PDFParser = require("pdf2json");
    
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        
        pdfParser.on("pdfParser_dataError", errData => {
            console.error("Error parsing PDF:", errData.parserError);
            resolve(NextResponse.json({ success: false, error: "Error parsing PDF" }));
        });
        
        pdfParser.on("pdfParser_dataReady", pdfData => {
            const text = pdfParser.getRawTextContent();
            resolve(NextResponse.json({ success: true, text: text }));
        });
        
        pdfParser.parseBuffer(buffer);
    });

  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
