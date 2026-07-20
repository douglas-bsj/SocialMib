import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
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

export async function uploadFile(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = ALLOWED_TYPES[mimeType] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;

  if (process.env.S3_BUCKET && process.env.S3_ENDPOINT) {
    return uploadS3(buffer, filename, mimeType);
  }

  return uploadLocal(buffer, filename);
}

async function uploadLocal(buffer: Buffer, filename: string): Promise<string> {
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

// S3-compatible upload (AWS S3, Cloudflare R2, MinIO)
// Requires: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL
async function uploadS3(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const endpoint = process.env.S3_ENDPOINT!;
  const bucket = process.env.S3_BUCKET!;
  const accessKey = process.env.S3_ACCESS_KEY ?? "";
  const secretKey = process.env.S3_SECRET_KEY ?? "";
  const region = process.env.S3_REGION ?? "auto";
  const publicUrl = process.env.S3_PUBLIC_URL ?? `${endpoint}/${bucket}`;

  const url = `${endpoint}/${bucket}/${filename}`;
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const dateTimeStr = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const bodyHash = await sha256Hex(buffer);

  const canonicalRequest = [
    "PUT",
    `/${bucket}/${filename}`,
    "",
    `content-type:${mimeType}\nhost:${new URL(endpoint).host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${dateTimeStr}\n`,
    "content-type;host;x-amz-content-sha256;x-amz-date",
    bodyHash,
  ].join("\n");

  const credentialScope = `${dateStr}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dateTimeStr,
    credentialScope,
    await sha256Hex(Buffer.from(canonicalRequest)),
  ].join("\n");

  const signingKey = await deriveSigningKey(secretKey, dateStr, region, "s3");
  const signature = await hmacHex(signingKey, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "x-amz-content-sha256": bodyHash,
      "x-amz-date": dateTimeStr,
      Authorization: authHeader,
    },
    body: buffer.buffer as ArrayBuffer,
  });

  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status}`);
  }

  return `${publicUrl}/${filename}`;
}

// Crypto helpers (Node.js built-ins — no external deps)
async function sha256Hex(data: Buffer | string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(data).digest("hex");
}

async function hmacHex(key: Buffer | string, data: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", key).update(data).digest("hex");
}

async function hmacBuf(key: Buffer | string, data: string): Promise<Buffer> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", key).update(data).digest();
}

async function deriveSigningKey(secret: string, date: string, region: string, service: string): Promise<Buffer> {
  const kDate = await hmacBuf(`AWS4${secret}`, date);
  const kRegion = await hmacBuf(kDate, region);
  const kService = await hmacBuf(kRegion, service);
  return hmacBuf(kService, "aws4_request");
}
