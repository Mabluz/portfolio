import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const UPLOAD_ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** Resolve a relative upload path inside UPLOAD_ROOT. Returns null for anything that escapes it. */
export function resolveUploadPath(rel: string, root = UPLOAD_ROOT): string | null {
  if (!rel || rel.includes("\0")) return null;
  const full = path.resolve(root, rel);
  return full.startsWith(root + path.sep) ? full : null;
}

async function write(rel: string, data: Buffer) {
  const full = resolveUploadPath(rel)!;
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

/** Auto-rotate, limit to 2400px and convert to WebP. Returns the stored path and final size. */
export async function saveImage(file: File, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("Filen er ikke et bilde");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Bildet er for stort (maks 15 MB)");
  const input = Buffer.from(await file.arrayBuffer());
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const rel = `${folder}/${randomUUID()}.webp`;
  await write(rel, data);
  return { path: rel, width: info.width, height: info.height };
}

export async function savePdf(file: File, folder: string) {
  if (file.size > MAX_PDF_BYTES) throw new Error("PDF-en er for stor (maks 10 MB)");
  const input = Buffer.from(await file.arrayBuffer());
  if (input.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Filen er ikke en PDF");
  const rel = `${folder}/${randomUUID()}.pdf`;
  await write(rel, input);
  return rel;
}

export async function deleteUpload(rel: string | null | undefined) {
  if (!rel) return;
  const full = resolveUploadPath(rel);
  if (full) await rm(full, { force: true });
}

export async function readUpload(rel: string) {
  const full = resolveUploadPath(rel);
  if (!full) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ full);
  } catch {
    return null;
  }
}
