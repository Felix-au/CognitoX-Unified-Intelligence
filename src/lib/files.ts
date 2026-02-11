import { FileType } from "@/types/files";

export interface ParsedFile {
  filename: string;
  extension: FileType;
  content: string; // Text content or base64 for images
  mimeType: string;
  pdfImages?: Array<{ base64Content: string; mimeType: string; filename: string }>;
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

export async function parsePdfTextOrImages(buffer: Buffer): Promise<{ text: string; images: Array<{ base64Content: string; mimeType: string; filename: string }> }> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const uint8Array = new Uint8Array(buffer);
    const pdf = new PDFParse(uint8Array);
    
    // 1. Extract digital text
    let extractedText = "";
    try {
      const textData = await pdf.getText();
      extractedText = textData.text ? textData.text.trim() : "";
    } catch (err) {
      console.warn("Failed to extract digital text from PDF:", err);
    }
    
    // 2. Render each page as a screenshot (useful for layout preservation/Notes OCR)
    let images: Array<{ base64Content: string; mimeType: string; filename: string }> = [];
    try {
      console.log("Rendering PDF pages as screenshots...");
      const screenshotData = await pdf.getScreenshot({ imageDataUrl: true });
      images = (screenshotData.pages || []).map((page: any, idx: number) => {
        const base64 = page.dataUrl.split(",").pop() || "";
        return {
          base64Content: base64,
          mimeType: "image/png",
          filename: `page_${idx + 1}.png`
        };
      });
    } catch (err) {
      console.warn("Failed to render page screenshots from PDF:", err);
    }
    
    return { text: extractedText, images };
  } catch (error) {
    console.error("Failed to parse PDF text or render screenshots:", error);
    return { text: "", images: [] };
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
  let pdfImages: Array<{ base64Content: string; mimeType: string; filename: string }> | undefined;

  if (ext === 'pdf') {
    const parsed = await parsePdfTextOrImages(buffer);
    content = parsed.text;
    if (parsed.images.length > 0) {
      pdfImages = parsed.images;
    }
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
    mimeType,
    pdfImages
  };
}
