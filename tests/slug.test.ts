import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("handles Norwegian letters", () => expect(slugify("Mitt første prosjekt på Ålesund")).toBe("mitt-forste-prosjekt-pa-alesund"));
  it("collapses punctuation and trims dashes", () => expect(slugify("  --Hei!! Verden?  ")).toBe("hei-verden"));
  it("caps the length", () => expect(slugify("a".repeat(200)).length).toBe(80));
  it("returns empty for symbols only", () => expect(slugify("!!!")).toBe(""));
});
