import { describe, expect, it } from "vitest";
import { buildImagePrompt } from "@/lib/image-prompt";

const empty = { title: "", tagline: "", description: "" };
const base = {
  type: "BIG" as const,
  no: { title: "Matplan", tagline: "Planlegg middager for uka", description: "Norsk beskrivelse" },
  en: { title: "Meal planner", tagline: "Plan the week's dinners", description: "" },
  techs: ["Next.js", "Prisma"],
  liveUrl: "https://example.com",
};

describe("buildImagePrompt", () => {
  it("uses English text where it exists and falls back to Norwegian", () => {
    const prompt = buildImagePrompt(base);
    expect(prompt).toContain("Project: Meal planner");
    expect(prompt).toContain("Plan the week's dinners");
    expect(prompt).toContain("Norsk beskrivelse");
    expect(prompt).toContain("Built with: Next.js, Prisma");
    expect(prompt).toContain("https://example.com");
  });

  it("asks for four images in the site's formats for a big project", () => {
    const prompt = buildImagePrompt(base);
    expect(prompt).toContain("Create 4 images");
    for (const ratio of ["16:10", "21:9", "4:3"]) expect(prompt).toContain(ratio);
  });

  it("asks for two images for a small project", () => {
    expect(buildImagePrompt({ ...base, type: "SMALL" })).toContain("Create 2 images");
  });

  it("leaves out lines for empty fields", () => {
    const prompt = buildImagePrompt({ type: "SMALL", no: empty, en: empty, techs: [] });
    expect(prompt).toContain("(untitled project)");
    expect(prompt).not.toContain("Built with");
    expect(prompt).not.toContain("Description:");
    expect(prompt).not.toContain("Live site");
  });

  it("tells the AI not to draw a device frame", () => {
    expect(buildImagePrompt(base)).toMatch(/No laptop/);
  });
});
