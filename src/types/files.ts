export type FileType = "pdf" | "txt" | "md" | "png" | "jpg" | "jpeg" | "webp";

export const SUPPORTED_FILE_TYPES: FileType[] = [
  "pdf",
  "txt",
  "md",
  "png",
  "jpg",
  "jpeg",
  "webp"
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
