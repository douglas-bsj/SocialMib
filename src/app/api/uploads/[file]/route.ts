import { readFile } from "fs/promises";
import { join } from "path";
import type { NextRequest } from "next/server";
import { uploadDir } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve as imagens enviadas sem S3 (ver uploadDir em src/lib/storage.ts).
// Público de propósito: Instagram, Facebook, Pinterest e Threads baixam a imagem
// por esta URL na hora de publicar. Os nomes são UUIDs aleatórios.

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

// Só nomes gerados por uploadFile: <uuid>.<ext>. Bloqueia "../" e afins.
const VALID_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp)$/i;

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  const match = VALID_NAME.exec(file);
  if (!match) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(join(/*turbopackIgnore: true*/ uploadDir(), file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[match[1].toLowerCase()],
        "Content-Length": String(data.length),
        // Nome único por arquivo: o conteúdo nunca muda.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
