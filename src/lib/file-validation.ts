import { fileTypeFromBuffer } from "file-type";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const ALLOWED_MIMES = new Set(Object.keys(MIME_TO_EXT));

/**
 * Validates file by magic bytes. Returns detected mime and ext, or null if invalid/unsupported.
 * SVG is not allowed (XSS risk).
 */
export async function validateFileType(buffer: Buffer): Promise<{ mime: string; ext: string } | null> {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
    return null;
  }
  return {
    mime: detected.mime,
    ext: MIME_TO_EXT[detected.mime] ?? detected.ext,
  };
}

export function extFromMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? "bin";
}
