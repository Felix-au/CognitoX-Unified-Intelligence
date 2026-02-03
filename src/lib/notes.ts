import { generateOmniKeyCompletion } from "./omnikey";

export interface NotesOcrOptions {
  files: Array<{ filename: string; mimeType: string; base64Content: string }>;
}

/**
 * Perform high-fidelity OCR on uploaded notes using OmniKey AI.
 */
export async function processNotesOcr(options: NotesOcrOptions): Promise<string> {
  const { files } = options;

  if (!files || files.length === 0) {
    throw new Error("No files uploaded for OCR extraction.");
  }

  const systemInstruction = `You are a professional Notes OCR and study note formatter for CognitoX.
  Your tasks:
  1. Carefully scan the uploaded image(s) or document file(s).
  2. Perform high-fidelity text transcription. Do not hallucinate content; if a word or formula is illegible, mark it as [illegible].
  3. Format the extracted text into beautifully structured Markdown.
  4. Organise the notes with headings, subheadings, and clean bullet points.
  5. Bold important terms, and format math/code expressions properly.
  6. Add a "Key Concepts Summary" section at the top, and a short list of 3-5 "Potential Review Questions" at the bottom.
  
  Constraints:
  - Respond ONLY in clean Markdown format.
  - Do not include conversational preambles or post-scripts (like "Here is your transcription:").`;

  const userPrompt = "Perform OCR extraction and compile structured study notes from these files.";

  const result = await generateOmniKeyCompletion(userPrompt, {
    systemInstruction,
    files: files
  });

  return result.text;
}
