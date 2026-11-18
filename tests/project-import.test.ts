import { describe, expect, it } from "vitest";
import { buildAiPrompt, parseProjectImport, techAbbr } from "@/lib/project-import";

const full = {
  type: "SMALL",
  progress: "LIVE",
  year: "2026",
  liveUrl: "https://example.com",
  githubUrl: "",
  no: { title: "Tittel", tagline: "Linje", description: "Om", why: "Fordi", learned: "Mye", role: "Alt selv" },
  en: { title: "Title", tagline: "Line", description: "About", why: "Because", learned: "Lots", role: "Solo" },
  techs: [{ name: "Next.js", abbr: "NX", roleNo: "Rammeverk", roleEn: "Framework", whyNo: "Kjent", whyEn: "Familiar" }],
  lessons: [{ headNo: "Cache", bodyNo: "Vanskelig", headEn: "Caching", bodyEn: "Hard" }],
};

describe("parseProjectImport", () => {
  it("reads a complete object", () => {
    const res = parseProjectImport(JSON.stringify(full));
    expect(res).toEqual({ ok: true, data: full });
  });

  it("reads JSON inside a ```json block with text around it", () => {
    const res = parseProjectImport(`Her er filen:\n\`\`\`json\n${JSON.stringify(full, null, 2)}\n\`\`\`\nSi fra om noe mangler.`);
    expect(res.ok).toBe(true);
  });

  it("reads JSON with prose around it but no fence", () => {
    const res = parseProjectImport(`Svar: ${JSON.stringify(full)} Ferdig.`);
    expect(res.ok).toBe(true);
  });

  it("fills in defaults for missing fields", () => {
    const res = parseProjectImport('{ "no": { "title": "Bare tittel" } }');
    if (!res.ok) throw new Error(res.error);
    expect(res.data.type).toBe("BIG");
    expect(res.data.progress).toBe("IN_PROGRESS");
    expect(res.data.no).toEqual({ title: "Bare tittel", tagline: "", description: "", why: "", learned: "", role: "" });
    expect(res.data.en.title).toBe("");
    expect(res.data.techs).toEqual([]);
    expect(res.data.lessons).toEqual([]);
  });

  it("rejects text that is not JSON", () => {
    expect(parseProjectImport("ingen json her")).toEqual({ ok: false, error: "Teksten er ikke gyldig JSON" });
  });

  it("names the field that is wrong", () => {
    const res = parseProjectImport(JSON.stringify({ ...full, progress: "DONE" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("progress");
    const bad = parseProjectImport(JSON.stringify({ ...full, liveUrl: "example.com" }));
    if (!bad.ok) expect(bad.error).toContain("liveUrl");
    else throw new Error("expected an error");
  });

  it("enforces the same limits as the editor", () => {
    const res = parseProjectImport(JSON.stringify({ ...full, no: { ...full.no, title: "x".repeat(121) } }));
    expect(res.ok).toBe(false);
  });
});

describe("techAbbr", () => {
  it("makes a short code from the name", () => {
    expect(techAbbr("Next.js")).toBe("NE");
    expect(techAbbr("c")).toBe("C");
    expect(techAbbr("...")).toBe("?");
  });
});

describe("buildAiPrompt", () => {
  it("lists the existing techs and every field the import reads", () => {
    const prompt = buildAiPrompt(["Next.js", "Prisma"]);
    expect(prompt).toContain("Next.js, Prisma");
    for (const key of ["type", "progress", "year", "liveUrl", "githubUrl", "tagline", "description", "whyNo", "headEn"]) expect(prompt).toContain(`"${key}"`);
  });

  it("contains an example that the import itself accepts", () => {
    const example = buildAiPrompt([]).match(/\n(\{[\s\S]*?\n\})\n/)?.[1];
    expect(example).toBeDefined();
    expect(parseProjectImport(example!).ok).toBe(true);
  });

  it("uses no en dash outside the rule that forbids it", () => {
    const prompt = buildAiPrompt([]).replace(/\(–\)|\(—\)/g, "");
    expect(prompt).not.toMatch(/[–—]/);
  });
});
