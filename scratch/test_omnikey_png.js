const apiKey = "omnikey-g-06de23d8abb1cdcca22451e0af9b1a30da4544e31d5650fd";
const endpoint = 'https://omnikey-ai-unified-key-manager.onrender.com/v1beta/models/auto:generateContent';

async function testPng() {
  const minimalPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const contents = [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: minimalPngBase64
          }
        },
        {
          text: "Perform OCR extraction and compile structured study notes from this image."
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
      parts: [{ text: "You are a notes compiler. Transcribe the uploaded image." }]
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

testPng();
