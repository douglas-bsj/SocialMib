// Client-safe storage helpers (no Node built-ins) — importable from Client Components.
// The server-only upload logic lives in ./storage.ts.

/** Tipos de imagem aceitos → extensão do arquivo salvo. */
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Tipos de vídeo aceitos (hoje usados só pelo TikTok) → extensão. */
export const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (imagens)
// O site passa pela Cloudflare, que recusa envios acima de 100 MB no plano gratuito.
export const MAX_VIDEO_SIZE = 95 * 1024 * 1024; // 95 MB
export const MAX_IMAGES_PER_POST = 4;

export const VIDEO_EXTENSIONS = ["mp4", "mov", "webm"];

/** true se a URL/caminho aponta para um vídeo (pela extensão). */
export function isVideoUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(`.${ext}`));
}

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES[file.type]) {
    return "Formato não suportado. Use JPEG, PNG, GIF ou WebP.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo muito grande. Máximo 10 MB.";
  }
  return null;
}

/** Valida imagem ou vídeo enviado pelo site. */
export function validateMedia(file: File): string | null {
  if (ALLOWED_VIDEO_TYPES[file.type]) {
    if (file.size > MAX_VIDEO_SIZE) return "Vídeo muito grande. Máximo 95 MB.";
    return null;
  }
  if (!ALLOWED_TYPES[file.type]) {
    return "Formato não suportado. Use imagem (JPEG, PNG, GIF, WebP) ou vídeo (MP4, MOV, WebM).";
  }
  return validateImage(file);
}
