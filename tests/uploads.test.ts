import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUploadPath } from "@/lib/uploads";

const root = path.resolve("/srv/uploads");

describe("resolveUploadPath", () => {
  it("resolves a normal nested path", () => expect(resolveUploadPath("projects/1/a.webp", root)).toBe(path.join(root, "projects/1/a.webp")));
  it("rejects parent traversal", () => expect(resolveUploadPath("../etc/passwd", root)).toBeNull());
  it("rejects traversal hidden in the middle", () => expect(resolveUploadPath("projects/../../secret", root)).toBeNull());
  it("rejects absolute paths outside root", () => expect(resolveUploadPath("/etc/passwd", root)).toBeNull());
  it("rejects a sibling directory sharing the prefix", () => expect(resolveUploadPath("../uploads-evil/x", root)).toBeNull());
  it("rejects the root itself and empty input", () => {
    expect(resolveUploadPath("", root)).toBeNull();
    expect(resolveUploadPath(".", root)).toBeNull();
  });
  it("rejects null bytes", () => expect(resolveUploadPath("a\0b", root)).toBeNull());
});
