const fs = require('fs');
const path = require('path');

const apiKey = "omnikey-g-06de23d8abb1cdcca22451e0af9b1a30da4544e31d5650fd";
const endpoint = 'https://omnikey-ai-unified-key-manager.onrender.com/v1beta/models/auto:generateContent';

async function testPdf() {
  // Create a dummy small PDF base64 content or just read any file if it exists, or create a mock PDF.
  // A minimal valid 1-page PDF:
  const minimalPdfBase64 = "JVBERi0xLjQKMSAwIG9iaik8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj5lbmRvYmoKMyAwIG9iajw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3hbMCAwIDU5NSA4NDJdL0NvbnRlbnRzIDQgMCBSPj5lbmRvYmoKNCAwIG9iajw8L0xlbmd0aCAxNT4+c3RyZWFtCkJULyYgMTAgVGYoSGVsbG8pVEplbmRzdHJlYW1lbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE5IDAwMDAwIG4gCjAwMDAwMDAwNzAgMDAwMDAgbiAKMDAwMDAwMDEyMCAwMDAwMCBuIAowMDAwMDAwMjAxIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjY1CiUlRU9GCg==";

  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: minimalPdfBase64
          }
        },
        {
          text: "Perform OCR extraction and compile structured study notes from these files."
        }
      ]
    }
  ];

  const requestBody = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    },
    systemInstruction: {
      parts: [{ text: "You are a notes compiler. Transcribe the uploaded document." }]
    }
  };

  try {
    const url = `${endpoint}?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error calling gateway:", error);
  }
}

testPdf();
