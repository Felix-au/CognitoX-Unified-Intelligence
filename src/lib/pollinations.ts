const apiKey = process.env.POLLINATIONS_API_KEY || 'your-pollinations-api-key';
const endpoint = 'https://gen.pollinations.ai/v1/images/generations';

export interface ImageGenerationOptions {
  model?: string; // e.g., 'flux', 'flux-realism', etc.
  size?: string;  // e.g., '1024x1024', '1024x768'
}

/**
 * Generates an image using Pollinations.ai OpenAI-compatible POST endpoint.
 */
export async function generatePollinationsImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  try {
    const { model = 'flux', size = '1024x1024' } = options;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt,
        model,
        size
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pollinations.ai error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from Pollinations.ai API.');
    }

    return imageUrl;
  } catch (error) {
    console.error('Pollinations.ai image generation failed:', error);
    throw error;
  }
}
