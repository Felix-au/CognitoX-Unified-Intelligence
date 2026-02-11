import { FileType } from "@/types/files";
import { PDFParse } from "pdf-parse";

export interface ParsedFile {
  filename: string;
  extension: FileType;
  content: string; // Text content or base64 for images
  mimeType: string;
}

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

export async function parsePdfText(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const pdf = new PDFParse(uint8Array);
    const result = await pdf.getText();
    return result.text || "";
  } catch (error) {
    console.error("Failed to parse PDF text:", error);
    return "";
  }
}

/**
 * Normalizes file input and extracts text content if it's a document,
 * or formats it as a base64 string if it's an image.
 */
export async function parseUploadFile(file: File): Promise<ParsedFile> {
  const filename = file.name;
  const ext = filename.split('.').pop()?.toLowerCase() as FileType;
  const mimeType = getMimeType(filename);

  const buffer = Buffer.from(await file.arrayBuffer());

  let content = '';

  if (ext === 'pdf') {
    content = await parsePdfText(buffer);
  } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
    // Keep images as base64 for multimodal vision/OCR LLM queries
    content = buffer.toString('base64');
  } else {
    // Text and Markdown files
    content = buffer.toString('utf-8');
  }

  return {
    filename,
    extension: ext,
    content,
    mimeType
  };
}
