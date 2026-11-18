import { describe, expect, it } from "vitest";
import { aboutSchema, projectSchema } from "@/lib/validation";

const tr = { title: "", tagline: "", description: "", why: "", learned: "", role: "" };
const base = {
  slug: "mitt-prosjekt", type: "BIG", status: "DRAFT", progress: "LIVE", year: "2026", liveUrl: "", githubUrl: "",
  translations: { no: { ...tr, title: "Mitt" }, en: tr }, images: [], techs: [], lessons: [],
};

describe("projectSchema", () => {
  it("accepts a valid draft", () => expect(projectSchema.safeParse(base).success).toBe(true));
  it("accepts every progress value and nothing else", () => {
    for (const progress of ["LIVE", "IN_PROGRESS", "ABANDONED", "DISCONTINUED"]) expect(projectSchema.safeParse({ ...base, progress }).success).toBe(true);
    expect(projectSchema.safeParse({ ...base, progress: "DONE" }).success).toBe(false);
  });
  it("rejects bad slugs", () => {
    for (const slug of ["Mitt Prosjekt", "-a", "a--b", "æøå", ""]) expect(projectSchema.safeParse({ ...base, slug }).success, slug).toBe(false);
  });
  it("rejects non-http urls", () => {
    expect(projectSchema.safeParse({ ...base, liveUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, githubUrl: "ftp://x.y" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, liveUrl: "https://example.com" }).success).toBe(true);
  });
  it("requires a Norwegian title to publish", () => {
    const r = projectSchema.safeParse({ ...base, status: "PUBLISHED", translations: { no: tr, en: tr } });
    expect(r.success).toBe(false);
    expect(projectSchema.safeParse({ ...base, status: "PUBLISHED" }).success).toBe(true);
  });
});

describe("aboutSchema", () => {
  const ok = { aboutLeadNo: "", aboutLeadEn: "", aboutBodyNo: "", aboutBodyEn: "", email: "", githubUrl: "", linkedinUrl: "", tools: [] };
  it("accepts empty values", () => expect(aboutSchema.safeParse(ok).success).toBe(true));
  it("validates the email", () => {
    expect(aboutSchema.safeParse({ ...ok, email: "nope" }).success).toBe(false);
    expect(aboutSchema.safeParse({ ...ok, email: "a@b.no" }).success).toBe(true);
  });
});
