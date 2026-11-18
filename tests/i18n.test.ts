import { describe, expect, it } from "vitest";
import { dict, pick } from "@/lib/i18n";

describe("pick", () => {
  it("returns Norwegian for no", () => expect(pick("no", "Hei", "Hi")).toBe("Hei"));
  it("returns English when present", () => expect(pick("en", "Hei", "Hi")).toBe("Hi"));
  it("falls back to Norwegian when English is empty or blank", () => {
    expect(pick("en", "Hei", "")).toBe("Hei");
    expect(pick("en", "Hei", "   ")).toBe("Hei");
    expect(pick("en", "Hei", null)).toBe("Hei");
  });
  it("returns empty string when both are missing", () => expect(pick("en", undefined, undefined)).toBe(""));
  it("has the same keys in both dictionaries", () => expect(Object.keys(dict.en).sort()).toEqual(Object.keys(dict.no).sort()));
});
