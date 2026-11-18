import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Må starte med http:// eller https://");

const translation = z.object({
  title: text(120),
  tagline: text(300),
  description: text(8000),
  why: text(3000),
  learned: text(3000),
  role: text(120),
});

export const projectSchema = z
  .object({
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Adressen kan bare ha a-z, tall og bindestrek").max(80),
    type: z.enum(["BIG", "SMALL"]),
    status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]),
    progress: z.enum(["LIVE", "IN_PROGRESS"]),
    year: text(20),
    liveUrl: optionalUrl,
    githubUrl: optionalUrl,
    translations: z.object({ no: translation, en: translation }),
    images: z
      .array(z.object({ id: z.number().int(), galleryWidth: z.enum(["FULL", "HALF", "THIRD"]), captionNo: text(300), captionEn: text(300) }))
      .max(30),
    techs: z.array(z.object({ techId: z.number().int(), whyNo: text(600), whyEn: text(600) })).max(20),
    lessons: z.array(z.object({ headNo: text(200), bodyNo: text(2000), headEn: text(200), bodyEn: text(2000) })).max(12),
  })
  .superRefine((v, ctx) => {
    if (v.status === "PUBLISHED" && !v.translations.no.title) {
      ctx.addIssue({ code: "custom", path: ["translations", "no", "title"], message: "Norsk tittel må fylles ut før publisering" });
    }
  });

export type ProjectInput = z.infer<typeof projectSchema>;

export const techSchema = z.object({
  name: text(60).min(1, "Navn mangler"),
  abbr: text(4).min(1, "Kortkode mangler"),
  roleNo: text(40),
  roleEn: text(40),
});

export const aboutSchema = z.object({
  currentProjectId: z.number().int().nullable(),
  nowTextNo: text(200),
  nowTextEn: text(200),
  aboutLeadNo: text(300),
  aboutLeadEn: text(300),
  aboutBodyNo: text(6000),
  aboutBodyEn: text(6000),
  email: text(200).refine((v) => v === "" || /^\S+@\S+\.\S+$/.test(v), "Ugyldig e-postadresse"),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  tools: z.array(text(40).min(1)).max(40),
});

export type AboutInput = z.infer<typeof aboutSchema>;
