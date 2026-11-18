import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// UPLOAD_ROOT is read when the module loads, so the env var is set before importing it.
const dir = mkdtempSync(path.join(os.tmpdir(), "portfolio-uploads-"));
process.env.UPLOAD_DIR = dir;
let uploads: typeof import("@/lib/uploads");

beforeAll(async () => {
  uploads = await import("@/lib/uploads");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#336655" } }).png().toBuffer();
const file = (data: Buffer | string, name: string, type: string) =>
  new File([typeof data === "string" ? data : new Uint8Array(data)], name, { type });
const filesIn = (folder: string) => (existsSync(path.join(dir, folder)) ? readdirSync(path.join(dir, folder)) : []);

describe("saveImage", () => {
  it("converts to WebP and limits the size to 2400 px", async () => {
    const saved = await uploads.saveImage(file(await png(3000, 1500), "big.png", "image/png"), "projects/1");
    expect(saved.path).toMatch(/^projects\/1\/[0-9a-f-]{36}\.webp$/);
    expect([saved.width, saved.height]).toEqual([2400, 1200]);
    const meta = await sharp(readFileSync(path.join(dir, saved.path))).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([2400, 1200]);
  });

  it("does not enlarge small images", async () => {
    const saved = await uploads.saveImage(file(await png(200, 100), "small.png", "image/png"), "projects/2");
    expect([saved.width, saved.height]).toEqual([200, 100]);
  });

  it("rejects files that are not images", async () => {
    await expect(uploads.saveImage(file("hei", "a.txt", "text/plain"), "projects/3")).rejects.toThrow("ikke et bilde");
    expect(filesIn("projects/3")).toEqual([]);
  });

  it("rejects images over 15 MB", async () => {
    const big = file(Buffer.alloc(uploads.MAX_IMAGE_BYTES + 1), "big.png", "image/png");
    await expect(uploads.saveImage(big, "projects/4")).rejects.toThrow("for stort");
    expect(filesIn("projects/4")).toEqual([]);
  });

  it("rejects corrupt image data without writing anything", async () => {
    await expect(uploads.saveImage(file("not a png", "fake.png", "image/png"), "projects/5")).rejects.toThrow();
    expect(filesIn("projects/5")).toEqual([]);
  });
});

describe("savePdf", () => {
  it("stores a PDF unchanged", async () => {
    const pdf = Buffer.from("%PDF-1.7\n%test\n");
    const rel = await uploads.savePdf(file(pdf, "cv.pdf", "application/pdf"), "cv");
    expect(rel).toMatch(/^cv\/[0-9a-f-]{36}\.pdf$/);
    expect(readFileSync(path.join(dir, rel))).toEqual(pdf);
  });

  it("checks the content, not the file type or name", async () => {
    await expect(uploads.savePdf(file("<html>", "cv.pdf", "application/pdf"), "cv-fake")).rejects.toThrow("ikke en PDF");
    expect(filesIn("cv-fake")).toEqual([]);
  });

  it("rejects PDFs over 10 MB", async () => {
    const big = Buffer.alloc(uploads.MAX_PDF_BYTES + 1);
    big.write("%PDF-");
    await expect(uploads.savePdf(file(big, "cv.pdf", "application/pdf"), "cv-big")).rejects.toThrow("for stor");
    expect(filesIn("cv-big")).toEqual([]);
  });
});

describe("deleteUpload and readUpload", () => {
  it("reads and deletes a stored file", async () => {
    const rel = await uploads.savePdf(file("%PDF-1.4", "cv.pdf", "application/pdf"), "cv-del");
    expect((await uploads.readUpload(rel))?.toString()).toBe("%PDF-1.4");
    await uploads.deleteUpload(rel);
    expect(await uploads.readUpload(rel)).toBeNull();
  });

  it("ignores empty and escaping paths", async () => {
    await expect(uploads.deleteUpload(null)).resolves.toBeUndefined();
    await expect(uploads.deleteUpload("../outside")).resolves.toBeUndefined();
    expect(await uploads.readUpload("../outside")).toBeNull();
    expect(await uploads.readUpload("missing/file.webp")).toBeNull();
  });
});
