import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

const { ApiError, blankApiProject, mergeAbout, mergeProject, patchSummary, projectPatchSchema, aboutPatchSchema } = await import("@/lib/api-format");
type ApiProject = ReturnType<typeof blankApiProject>;

const current: ApiProject = {
  ...blankApiProject(),
  id: 3, slug: "matplan", type: "BIG", status: "DRAFT", progress: "IN_PROGRESS", year: "2026",
  no: { title: "Matplan", tagline: "Planlegg middager", description: "Om", why: "Fordi", learned: "Mye", role: "Alt selv" },
  en: { title: "Meal planner", tagline: "", description: "", why: "", learned: "", role: "" },
  techs: [{ name: "Next.js", abbr: "NX", roleNo: "Rammeverk", roleEn: "Framework", whyNo: "Kjent", whyEn: "Familiar" }],
  lessons: [{ headNo: "A", bodyNo: "B", headEn: "", bodyEn: "" }],
  images: [
    { id: 10, url: "/uploads/a.webp", width: 800, height: 500, galleryWidth: "FULL", captionNo: "", captionEn: "" },
    { id: 11, url: "/uploads/b.webp", width: 800, height: 500, galleryWidth: "HALF", captionNo: "To", captionEn: "" },
  ],
  updatedAt: "2026-11-19T10:00:00.000Z",
};

const merge = (patch: unknown, base = current) => mergeProject(base, projectPatchSchema.parse(patch));

describe("mergeProject", () => {
  it("keeps everything when the patch is empty", () => {
    const { input, techs } = merge({});
    expect(input.slug).toBe("matplan");
    expect(input.translations.no.title).toBe("Matplan");
    expect(input.images.map((i) => i.id)).toEqual([10, 11]);
    expect(techs.map((t) => t.name)).toEqual(["Next.js"]);
    expect(input.lessons).toHaveLength(1);
  });

  it("merges no/en per field and replaces lists", () => {
    const { input } = merge({ no: { tagline: "Ny" }, lessons: [] });
    expect(input.translations.no).toMatchObject({ title: "Matplan", tagline: "Ny", why: "Fordi" });
    expect(input.lessons).toEqual([]);
  });

  it("accepts a whole GET response sent back unchanged", () => {
    expect(() => merge(current)).not.toThrow();
  });

  it("keeps a tech's reason when only the name is sent, and adds new techs by name", () => {
    const { techs, input } = merge({ techs: [{ name: "next.js" }, { name: "Prisma", whyNo: "ORM" }] });
    expect(techs.map((t) => [t.name, t.whyNo])).toEqual([["next.js", "Kjent"], ["Prisma", "ORM"]]);
    expect(input.techs).toHaveLength(2);
  });

  it("rejects the same tech twice", () => {
    expect(() => merge({ techs: [{ name: "React" }, { name: "react" }] })).toThrow(ApiError);
  });

  it("reorders and edits images, but only the existing ones", () => {
    const { input } = merge({ images: [{ id: 11, captionNo: "Første" }, { id: 10 }] });
    expect(input.images.map((i) => [i.id, i.captionNo])).toEqual([[11, "Første"], [10, ""]]);
    expect(() => merge({ images: [{ id: 10 }] })).toThrow(/eksisterende bildene/);
    expect(() => merge({ images: [{ id: 10 }, { id: 99 }] })).toThrow(ApiError);
    expect(() => merge({ images: [{ id: 10 }, { id: 10 }] })).toThrow(ApiError);
  });

  it("applies the same rules as the admin form", () => {
    expect(() => merge({ status: "PUBLISHED", no: { title: "" } })).toThrow(/^no\.title: Norsk tittel/);
    expect(() => merge({ liveUrl: "example.com" })).toThrow(/liveUrl/);
    expect(() => merge({ slug: "Ikke Gyldig!" })).toThrow(/slug/);
    expect(() => merge({ no: { title: "x".repeat(121) } })).toThrow(ApiError);
  });

  it("rejects unknown fields, so typos don't pass silently", () => {
    expect(() => projectPatchSchema.parse({ titel: "x" })).toThrow();
    expect(() => projectPatchSchema.parse({ no: { titel: "x" } })).toThrow();
  });

  it("derives the slug from the Norwegian title for a new project", () => {
    expect(merge({ no: { title: "Min første app" } }, blankApiProject()).input.slug).toBe("min-forste-app");
  });
});

describe("mergeAbout", () => {
  const about = { leadNo: "Hei", leadEn: "", bodyNo: "", bodyEn: "", email: "", githubUrl: "", linkedinUrl: "", tools: ["React"], heroProjectId: null, photoUrl: null, cvUrl: null };

  it("maps API names to the database fields and keeps what's not sent", () => {
    expect(mergeAbout(about, aboutPatchSchema.parse({ bodyNo: "Tekst", tools: ["Vim"] }))).toMatchObject({ aboutLeadNo: "Hei", aboutBodyNo: "Tekst", tools: ["Vim"] });
  });

  it("reports errors with the API's field names", () => {
    expect(() => mergeAbout(about, aboutPatchSchema.parse({ leadNo: "x".repeat(301) }))).toThrow(/^leadNo:/);
    expect(() => mergeAbout(about, aboutPatchSchema.parse({ email: "ikke-epost" }))).toThrow(/email/);
  });
});

describe("patchSummary", () => {
  it("lists the touched fields, with no/en expanded", () => {
    expect(patchSummary({ id: 3, no: { title: "x", tagline: "y" }, techs: [] })).toBe("no.title, no.tagline, techs");
    expect(patchSummary({})).toBe("ingen felter");
    expect(patchSummary({ tools: [], photoUrl: "/uploads/x.webp", cvUrl: "/cv", updatedAt: "x" })).toBe("tools");
  });
});
