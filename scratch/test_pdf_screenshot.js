const { PDFParse } = require('pdf-parse');

const minimalPdfBase64 = "JVBERi0xLjQKMSAwIG9iaik8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj5lbmRvYmoKMyAwIG9iajw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3hbMCAwIDU5NSA4NDJdL0NvbnRlbnRzIDQgMCBSPj5lbmRvYmoKNCAwIG9iajw8L0xlbmd0aCAxNT4+c3RyZWFtCkJULyYgMTAgVGYoSGVsbG8pVEplbmRzdHJlYW1lbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE5IDAwMDAwIG4gCjAwMDAwMDAwNzAgMDAwMDAgbiAKMDAwMDAwMDEyMCAwMDAwMCBuIAowMDAwMDAwMjAxIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjY1CiUlRU9GCg==";
const buffer = Buffer.from(minimalPdfBase64, 'base64');
const uint8Array = new Uint8Array(buffer);

const pdf = new PDFParse(uint8Array);
pdf.getScreenshot({ imageDataUrl: true }).then(data => {
  console.log("Pages Rendered:", data.pages.length);
  if (data.pages.length > 0) {
    console.log("First Page Image Data URL prefix:", data.pages[0].dataUrl.substring(0, 50));
  }
}).catch(err => {
  console.error("Error rendering PDF:", err);
});
