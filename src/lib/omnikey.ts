const apiKey = process.env.OMNIKEY_API_KEY || 'your-omnikey-api-key';
const endpoint = 'https://omnikey-ai-unified-key-manager.onrender.com/v1beta/models/auto:generateContent';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export interface GenerateOptions {
  history?: Array<{ sender: 'user' | 'bot' | 'system'; content: string }>;
  systemInstruction?: string;
  files?: Array<{ filename: string; mimeType: string; base64Content: string }>;
}

/**
 * Call the OmniKey AI unified gateway using the Gemini API format.
 */
export async function generateOmniKeyCompletion(
  prompt: string,
  options: GenerateOptions = {}
): Promise<{ text: string; rawResponse: any }> {
  try {
    const { history = [], systemInstruction, files = [] } = options;
    const contents: ChatMessage[] = [];

    // Map database history into Gemini format (user -> user, bot -> model)
    history.forEach((msg) => {
      if (msg.sender === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.sender === 'bot') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    });

    // Construct the current message parts
    const currentParts: any[] = [];

    // Append files (multimodal inlineData) if present
    files.forEach((file) => {
      currentParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64Content
        }
      });
    });

    // Append the user text prompt
    currentParts.push({ text: prompt });

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const url = `${endpoint}?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OmniKey Gateway error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      text: generatedText,
      rawResponse: data
    };
  } catch (error) {
    console.error('OmniKey API call failed:', error);
    throw error;
  }
}
