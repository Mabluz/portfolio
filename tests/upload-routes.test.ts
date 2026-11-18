import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// UPLOAD_ROOT is read when the module loads, so the env var is set before importing the routes.
const base = mkdtempSync(path.join(os.tmpdir(), "portfolio-routes-"));
const dir = path.join(base, "uploads");
process.env.UPLOAD_DIR = dir;

const settings = vi.hoisted(() => ({ cvPath: null as string | null }));
vi.mock("@/lib/queries", () => ({ getSettings: async () => settings }));

type Get = (req: Request, ctx: { params: Promise<{ path: string[] }> }) => Promise<Response>;
let uploadsGet: Get;
let cvGet: () => Promise<Response>;

beforeAll(async () => {
  mkdirSync(path.join(dir, "projects/1"), { recursive: true });
  mkdirSync(path.join(dir, "cv"), { recursive: true });
  writeFileSync(path.join(dir, "projects/1/a.webp"), "webp-data");
  writeFileSync(path.join(dir, "projects/1/notes.html"), "<script>");
  writeFileSync(path.join(dir, "cv/cv.pdf"), "%PDF-1.7");
  // A secret next to the upload folder, so a traversal would have something to find
  writeFileSync(path.join(base, "secret.txt"), "secret");
  uploadsGet = (await import("@/app/uploads/[...path]/route")).GET as unknown as Get;
  cvGet = (await import("@/app/cv/route")).GET;
});
afterAll(() => rmSync(base, { recursive: true, force: true }));
beforeEach(() => {
  settings.cvPath = null;
});

const get = (...parts: string[]) => uploadsGet(new Request("http://localhost/uploads"), { params: Promise.resolve({ path: parts }) });

describe("GET /uploads/[...path]", () => {
  it("serves a stored image with type and long cache", async () => {
    const res = await get("projects", "1", "a.webp");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("webp-data");
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("serves unknown extensions as a download type, never as HTML", async () => {
    const res = await get("projects", "1", "notes.html");
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
  });

  it("returns 404 for missing files", async () => {
    expect((await get("projects", "1", "missing.webp")).status).toBe(404);
  });

  it("returns 404 for traversal out of the upload folder", async () => {
    expect((await get("..", "secret.txt")).status).toBe(404);
    expect((await get("projects", "..", "..", "secret.txt")).status).toBe(404);
    expect((await get("..%2Fsecret.txt")).status).toBe(404);
  });
});

describe("GET /cv", () => {
  it("returns 404 when no CV is uploaded", async () => {
    expect((await cvGet()).status).toBe(404);
  });

  it("returns 404 when the file is gone from disk", async () => {
    settings.cvPath = "cv/deleted.pdf";
    expect((await cvGet()).status).toBe(404);
  });

  it("serves the CV as a PDF download", async () => {
    settings.cvPath = "cv/cv.pdf";
    const res = await cvGet();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("%PDF-1.7");
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("attachment");
  });
});
