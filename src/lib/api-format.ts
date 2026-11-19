import "server-only";
import { z } from "zod";
import type { SiteSettings } from "@/generated/prisma/client";
import { imageUrl, type FullProject, tr } from "@/lib/queries";
import { slugify } from "@/lib/slug";
import { aboutSchema, type AboutInput, projectSchema, type ProjectInput } from "@/lib/validation";

/**
 * The JSON format of /api/v1. GET returns exactly what PATCH accepts, so a client can fetch,
 * change and send back. Validation of the merged result reuses projectSchema / aboutSchema, so
 * the API has the same limits and rules as the admin forms.
 */

const TR_KEYS = ["title", "tagline", "description", "why", "learned", "role"] as const;
type Tr = Record<(typeof TR_KEYS)[number], string>;

export type ApiProject = {
  id: number; slug: string; type: "BIG" | "SMALL"; status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  progress: "LIVE" | "IN_PROGRESS" | "ABANDONED" | "DISCONTINUED"; year: string; liveUrl: string; githubUrl: string;
  no: Tr; en: Tr;
  techs: { name: string; abbr: string; roleNo: string; roleEn: string; whyNo: string; whyEn: string }[];
  lessons: { headNo: string; bodyNo: string; headEn: string; bodyEn: string }[];
  images: { id: number; url: string; width: number; height: number; galleryWidth: "FULL" | "HALF" | "THIRD"; captionNo: string; captionEn: string }[];
  updatedAt: string;
};

function trOf(p: FullProject, locale: "no" | "en"): Tr {
  const t = tr(p, locale);
  return Object.fromEntries(TR_KEYS.map((k) => [k, t?.[k] ?? ""])) as Tr;
}

export function toApiProject(p: FullProject): ApiProject {
  return {
    id: p.id, slug: p.slug, type: p.type, status: p.status, progress: p.progress, year: p.year,
    liveUrl: p.liveUrl ?? "", githubUrl: p.githubUrl ?? "",
    no: trOf(p, "no"), en: trOf(p, "en"),
    techs: p.techs.map((t) => ({ name: t.tech.name, abbr: t.tech.abbr, roleNo: t.tech.roleNo, roleEn: t.tech.roleEn, whyNo: t.whyNo, whyEn: t.whyEn })),
    lessons: p.lessons.map((l) => ({ headNo: l.headNo, bodyNo: l.bodyNo, headEn: l.headEn, bodyEn: l.bodyEn })),
    images: p.images.map((i) => ({ id: i.id, url: imageUrl(i.path)!, width: i.width, height: i.height, galleryWidth: i.galleryWidth, captionNo: i.captionNo, captionEn: i.captionEn })),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toApiProjectSummary(p: FullProject) {
  const no = tr(p, "no");
  return { id: p.id, slug: p.slug, type: p.type, status: p.status, progress: p.progress, year: p.year, title: no?.title ?? "", tagline: no?.tagline ?? "", images: p.images.length, updatedAt: p.updatedAt.toISOString() };
}

// Read-only fields a client may send back unchanged from a GET; they are ignored.
const readOnly = { id: z.unknown().optional(), updatedAt: z.unknown().optional() };

const trPatch = z.object(Object.fromEntries(TR_KEYS.map((k) => [k, z.string().optional()])) as Record<(typeof TR_KEYS)[number], z.ZodOptional<z.ZodString>>).strict();

export const projectPatchSchema = z
  .object({
    ...readOnly,
    slug: z.string().optional(),
    type: z.enum(["BIG", "SMALL"]).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).optional(),
    progress: z.enum(["LIVE", "IN_PROGRESS", "ABANDONED", "DISCONTINUED"]).optional(),
    year: z.string().optional(),
    liveUrl: z.string().optional(),
    githubUrl: z.string().optional(),
    no: trPatch.optional(),
    en: trPatch.optional(),
    techs: z.array(z.object({
      name: z.string().trim().min(1, "Teknologi mangler navn").max(60),
      abbr: z.string().trim().max(4).optional(), roleNo: z.string().trim().max(40).optional(), roleEn: z.string().trim().max(40).optional(),
      whyNo: z.string().optional(), whyEn: z.string().optional(),
    }).strict()).optional(),
    lessons: z.array(z.object({ headNo: z.string().default(""), bodyNo: z.string().default(""), headEn: z.string().default(""), bodyEn: z.string().default("") }).strict()).optional(),
    images: z.array(z.object({
      id: z.number().int(), galleryWidth: z.enum(["FULL", "HALF", "THIRD"]).optional(),
      captionNo: z.string().optional(), captionEn: z.string().optional(),
      url: z.unknown().optional(), width: z.unknown().optional(), height: z.unknown().optional(),
    }).strict()).optional(),
  })
  .strict();

export type ProjectPatch = z.infer<typeof projectPatchSchema>;
export type TechSpec = NonNullable<ProjectPatch["techs"]>[number];

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** First zod issue as "path: message", for 400 responses. */
export function zodMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join(".");
  return path ? `${path}: ${issue.message}` : (issue?.message ?? "Ugyldige data");
}

/** An empty project, used as the base when the API creates one. */
export function blankApiProject(): ApiProject {
  const empty = Object.fromEntries(TR_KEYS.map((k) => [k, ""])) as Tr;
  return { id: 0, slug: "", type: "SMALL", status: "DRAFT", progress: "LIVE", year: "", liveUrl: "", githubUrl: "", no: { ...empty }, en: { ...empty }, techs: [], lessons: [], images: [], updatedAt: "" };
}

/**
 * Applies a patch to the current project and validates the result with projectSchema.
 * Lists replace the whole list; `no`/`en` merge per field. Techs are returned by name, with
 * temporary ids, so nothing is created in the shared tech list before validation has passed.
 */
export function mergeProject(current: ApiProject, patch: ProjectPatch): { input: ProjectInput; techs: TechSpec[] } {
  const techs: TechSpec[] = patch.techs
    ? patch.techs.map((t) => {
      // Keep the existing reason when the client only sends the name
      const old = current.techs.find((o) => o.name.toLowerCase() === t.name.toLowerCase());
      return { ...t, whyNo: t.whyNo ?? old?.whyNo ?? "", whyEn: t.whyEn ?? old?.whyEn ?? "" };
    })
    : current.techs;
  const names = techs.map((t) => t.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) throw new ApiError(400, "techs: samme teknologi er med flere ganger");

  let images = current.images;
  if (patch.images) {
    const ids = patch.images.map((i) => i.id);
    const known = new Set(current.images.map((i) => i.id));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
      throw new ApiError(400, `images: listen må inneholde nøyaktig de eksisterende bildene (id ${[...known].join(", ") || "ingen"}), i ønsket rekkefølge. Nye bilder lastes opp i admin.`);
    }
    images = patch.images.map((p) => {
      const old = current.images.find((i) => i.id === p.id)!;
      return { ...old, galleryWidth: p.galleryWidth ?? old.galleryWidth, captionNo: p.captionNo ?? old.captionNo, captionEn: p.captionEn ?? old.captionEn };
    });
  }

  const no = { ...current.no, ...patch.no };
  const en = { ...current.en, ...patch.en };
  const slug = patch.slug ?? (current.slug || slugify(no.title) || "nytt-prosjekt");
  const raw = {
    slug,
    type: patch.type ?? current.type,
    status: patch.status ?? current.status,
    progress: patch.progress ?? current.progress,
    year: patch.year ?? current.year,
    liveUrl: patch.liveUrl ?? current.liveUrl,
    githubUrl: patch.githubUrl ?? current.githubUrl,
    translations: { no, en },
    images: images.map((i) => ({ id: i.id, galleryWidth: i.galleryWidth, captionNo: i.captionNo, captionEn: i.captionEn })),
    techs: techs.map((t, i) => ({ techId: -(i + 1), whyNo: t.whyNo ?? "", whyEn: t.whyEn ?? "" })),
    lessons: patch.lessons ?? current.lessons,
  };
  const parsed = projectSchema.safeParse(raw);
  // Report the API's field names ("no.title"), not the internal shape ("translations.no.title")
  if (!parsed.success) throw new ApiError(400, zodMessage(parsed.error).replace(/^translations\./, ""));
  return { input: parsed.data, techs };
}

const READ_ONLY = new Set(["id", "updatedAt", "photoUrl", "cvUrl"]);

/** Which fields a patch touches, e.g. "slug, no.title, techs", for the audit log. */
export function patchSummary(patch: Record<string, unknown>): string {
  const fields: string[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (READ_ONLY.has(k)) continue;
    if ((k === "no" || k === "en") && v && typeof v === "object") fields.push(...Object.keys(v).map((f) => `${k}.${f}`));
    else fields.push(k);
  }
  return fields.join(", ") || "ingen felter";
}

// ---- About -------------------------------------------------------------------------------

export type ApiAbout = {
  leadNo: string; leadEn: string; bodyNo: string; bodyEn: string;
  email: string; githubUrl: string; linkedinUrl: string; tools: string[];
  heroProjectId: number | null; photoUrl: string | null; cvUrl: string | null;
};

export function toApiAbout(s: SiteSettings): ApiAbout {
  return {
    leadNo: s.aboutLeadNo, leadEn: s.aboutLeadEn, bodyNo: s.aboutBodyNo, bodyEn: s.aboutBodyEn,
    email: s.email, githubUrl: s.githubUrl, linkedinUrl: s.linkedinUrl, tools: s.tools,
    heroProjectId: s.currentProjectId, photoUrl: imageUrl(s.photoPath), cvUrl: s.cvPath ? "/cv" : null,
  };
}

export const aboutPatchSchema = z
  .object({
    leadNo: z.string().optional(), leadEn: z.string().optional(), bodyNo: z.string().optional(), bodyEn: z.string().optional(),
    email: z.string().optional(), githubUrl: z.string().optional(), linkedinUrl: z.string().optional(),
    tools: z.array(z.string()).optional(),
    heroProjectId: z.number().int().nullable().optional(),
    // Read-only, ignored when sent back
    photoUrl: z.unknown().optional(), cvUrl: z.unknown().optional(),
  })
  .strict();

export type AboutPatch = z.infer<typeof aboutPatchSchema>;

export function mergeAbout(current: ApiAbout, patch: AboutPatch): AboutInput {
  const raw = {
    aboutLeadNo: patch.leadNo ?? current.leadNo, aboutLeadEn: patch.leadEn ?? current.leadEn,
    aboutBodyNo: patch.bodyNo ?? current.bodyNo, aboutBodyEn: patch.bodyEn ?? current.bodyEn,
    email: patch.email ?? current.email, githubUrl: patch.githubUrl ?? current.githubUrl, linkedinUrl: patch.linkedinUrl ?? current.linkedinUrl,
    tools: patch.tools ?? current.tools,
  };
  const parsed = aboutSchema.safeParse(raw);
  if (!parsed.success) {
    // Report the API's field names, not the database columns
    const names: Record<string, string> = { aboutLeadNo: "leadNo", aboutLeadEn: "leadEn", aboutBodyNo: "bodyNo", aboutBodyEn: "bodyEn" };
    const issue = parsed.error.issues[0];
    const path = issue?.path.map((p) => names[String(p)] ?? String(p)).join(".");
    throw new ApiError(400, path ? `${path}: ${issue.message}` : "Ugyldige data");
  }
  return parsed.data;
}
