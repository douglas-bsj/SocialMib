import { open, stat } from "fs/promises";
import { join } from "path";
import type { NextRequest } from "next/server";
import { uploadDir } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve as imagens e vídeos enviados sem S3 (ver uploadDir em src/lib/storage.ts).
// Público de propósito: Instagram, Facebook, Pinterest, Threads e TikTok (fotos)
// baixam a mídia por esta URL na hora de publicar. Os nomes são UUIDs aleatórios.

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

// Só nomes gerados por uploadFile: <uuid>.<ext>. Bloqueia "../" e afins.
const VALID_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp|mp4|mov|webm)$/i;

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(req: NextRequest, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  const match = VALID_NAME.exec(file);
  if (!match) return notFound();

  const path = join(/*turbopackIgnore: true*/ uploadDir(), file);
  let size: number;
  try {
    const info = await stat(path);
    if (!info.isFile()) return notFound();
    size = info.size;
  } catch {
    return notFound();
  }

  const headers: Record<string, string> = {
    "Content-Type": CONTENT_TYPES[match[1].toLowerCase()],
    "Accept-Ranges": "bytes",
    // Nome único por arquivo: o conteúdo nunca muda.
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  // Vídeos: o navegador pede pedaços (Range) para tocar e avançar.
  let start = 0;
  let end = size - 1;
  let status = 200;
  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] || m[2])) {
      if (m[1]) {
        start = Number(m[1]);
        end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      } else {
        start = Math.max(0, size - Number(m[2])); // "bytes=-N": últimos N bytes
      }
      if (start > end || start >= size) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    }
  }

  const length = end - start + 1;
  headers["Content-Length"] = String(length);

  const handle = await open(path, "r");
  const buffer = Buffer.alloc(length);
  try {
    await handle.read(buffer, 0, length, start);
  } finally {
    await handle.close();
  }
  return new Response(new Uint8Array(buffer), { status, headers });
}
