// Client-safe storage helpers (no Node built-ins) — importable from Client Components.
// The server-only upload logic lives in ./storage.ts.

export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGES_PER_POST = 4;

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES[file.type]) {
    return "Formato não suportado. Use JPEG, PNG, GIF ou WebP.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo muito grande. Máximo 10 MB.";
  }
  return null;
}
