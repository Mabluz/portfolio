import { describe, expect, it } from "vitest";
import { dict, heroTexts, pick, progressLabel, type Progress } from "@/lib/i18n";

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

const ALL: Progress[] = ["IN_PROGRESS", "LIVE", "ABANDONED", "DISCONTINUED"];

describe("hero card texts", () => {
  it("keeps today's texts for a project in progress", () => {
    expect(heroTexts(dict.no, "IN_PROGRESS")).toEqual({ label: "Akkurat nå bygger jeg", badge: "Under arbeid", cta: "Følg med" });
  });
  it("has its own non-empty texts for every status, in both languages", () => {
    for (const t of [dict.no, dict.en]) {
      const seen = ALL.map((p) => heroTexts(t, p));
      for (const x of seen) expect(Object.values(x).every((v) => v.trim().length > 0)).toBe(true);
      expect(new Set(seen.map((x) => x.label)).size).toBe(ALL.length);
      expect(new Set(seen.map((x) => x.badge)).size).toBe(ALL.length);
    }
  });
});

describe("progressLabel", () => {
  it("names every status on the project page", () => {
    expect(ALL.map((p) => progressLabel(dict.no, p))).toEqual(["Pågår", "Live", "Gitt opp", "Lagt ned"]);
    expect(ALL.map((p) => progressLabel(dict.en, p))).toEqual(["In progress", "Live", "Gave up", "Shut down"]);
  });
});
