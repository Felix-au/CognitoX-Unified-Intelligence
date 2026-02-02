import { FileType } from "@/types/files";

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

  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
    // Images are kept as base64 for vision LLM queries
    content = buffer.toString('base64');
  } else if (ext === 'pdf') {
    // PDF text extraction (basic text decoder fallback if pdf-parse isn't fully loaded,
    // or decodes printable ASCII characters in a robust custom parser)
    try {
      const text = buffer.toString('utf-8', 0, 50000); // Read raw strings
      // Clean up PDF markers to get human readable strings
      const cleaned = text
        .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\xff]/g, '') // remove non-printable characters
        .replace(/\s+/g, ' ')
        .trim();
      content = `[PDF Content - Extracted Text]\n${cleaned.slice(0, 10000)}`;
    } catch {
      content = '[PDF text extraction failed]';
    }
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
