async function test() {
  try {
    const pdfParseModule = await import('pdf-parse');
    console.log("Keys:", Object.keys(pdfParseModule));
    console.log("PDFParse:", pdfParseModule.PDFParse);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
