import { describe, expect, it } from "vitest";
import { buildImagePrompt } from "@/lib/image-prompt";

const empty = { title: "", tagline: "", description: "" };
const base = {
  type: "BIG" as const,
  progress: "LIVE" as const,
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
    expect(prompt).toContain("Status: live and in use");
    expect(prompt).toContain("https://example.com");
  });

  it("starts with a designed cover image in 16:10", () => {
    const prompt = buildImagePrompt(base);
    expect(prompt).toMatch(/1\. Cover image, 16:10/);
    expect(prompt).toContain("Not a screenshot");
    // The techs become chips on the cover
    expect(prompt).toContain("monospace font (Next.js, Prisma)");
  });

  it("asks for the cover plus four screenshots in the site's formats for a big project", () => {
    const prompt = buildImagePrompt(base);
    expect(prompt).toContain("Create 5 images");
    expect(prompt).toMatch(/5\. Detail, 4:3/);
    for (const ratio of ["16:10", "21:9", "4:3"]) expect(prompt).toContain(ratio);
  });

  it("asks for the cover plus two screenshots for a small project", () => {
    const prompt = buildImagePrompt({ ...base, type: "SMALL" });
    expect(prompt).toContain("Create 3 images");
    expect(prompt).not.toContain("21:9");
  });

  it("suggests a progress indicator only while the project is in progress", () => {
    expect(buildImagePrompt({ ...base, progress: "IN_PROGRESS" })).toContain("progress indicator");
    expect(buildImagePrompt(base)).not.toContain("progress indicator");
  });

  it("leaves out lines for empty fields", () => {
    const prompt = buildImagePrompt({ type: "SMALL", progress: "IN_PROGRESS", no: empty, en: empty, techs: [] });
    expect(prompt).toContain("(untitled project)");
    expect(prompt).not.toContain("Built with");
    expect(prompt).not.toContain("Description:");
    expect(prompt).not.toContain("Live site");
    expect(prompt).toContain("the project's tech stack");
  });

  it("tells the AI not to draw a device frame", () => {
    expect(buildImagePrompt(base)).toMatch(/No laptop/);
  });
});
