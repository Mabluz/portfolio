import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { techAbbr } from "@/lib/project-import";
import type { AboutInput, ProjectInput } from "@/lib/validation";

/**
 * Writes shared by the admin Server Actions and the API (/api/v1). Callers authenticate and
 * validate (projectSchema / aboutSchema) first; this layer only checks what needs the database.
 */

export type WriteResult = { ok: true } | { ok: false; error: string };

export function revalidateSite() {
  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

/** Replaces a project's data. Images are only reordered and edited, never added or removed. */
export async function writeProject(id: number, v: ProjectInput): Promise<WriteResult> {
  const clash = await db.project.findFirst({ where: { slug: v.slug, NOT: { id } }, select: { id: true } });
  if (clash) return { ok: false, error: "Adressen brukes av et annet prosjekt" };

  const techIds = new Set(v.techs.map((t) => t.techId));
  if (techIds.size !== v.techs.length) return { ok: false, error: "Samme teknologi er lagt til flere ganger" };

  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: { slug: v.slug, type: v.type, status: v.status, progress: v.progress, year: v.year, liveUrl: v.liveUrl || null, githubUrl: v.githubUrl || null },
    });
    for (const locale of ["no", "en"] as const) {
      await tx.projectTranslation.upsert({
        where: { projectId_locale: { projectId: id, locale } },
        update: v.translations[locale],
        create: { projectId: id, locale, ...v.translations[locale] },
      });
    }
    for (const [i, img] of v.images.entries()) {
      // updateMany with projectId guards against ids from other projects
      await tx.projectImage.updateMany({
        where: { id: img.id, projectId: id },
        data: { sortOrder: i, galleryWidth: i === 0 ? "FULL" : img.galleryWidth, captionNo: img.captionNo, captionEn: img.captionEn },
      });
    }
    await tx.projectTech.deleteMany({ where: { projectId: id } });
    await tx.projectTech.createMany({ data: v.techs.map((t, i) => ({ projectId: id, techId: t.techId, sortOrder: i, whyNo: t.whyNo, whyEn: t.whyEn })) });
    await tx.lesson.deleteMany({ where: { projectId: id } });
    await tx.lesson.createMany({ data: v.lessons.map((l, i) => ({ projectId: id, sortOrder: i, ...l })) });
  });
  revalidateSite();
  return { ok: true };
}

/** An empty draft at the end of the list, with a free "nytt-prosjekt" slug. */
export async function createDraftProject(): Promise<{ id: number; slug: string }> {
  const last = await db.project.aggregate({ _max: { sortOrder: true } });
  let slug = "nytt-prosjekt";
  for (let i = 2; await db.project.findUnique({ where: { slug } }); i++) slug = `nytt-prosjekt-${i}`;
  const project = await db.project.create({
    data: {
      slug,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
      translations: { create: [{ locale: "no", title: "Nytt prosjekt" }, { locale: "en" }] },
    },
  });
  revalidatePath("/admin");
  return { id: project.id, slug: project.slug };
}

/** Chooses the project in the front page hero card, or none (null). */
export async function writeHeroProject(id: number | null): Promise<WriteResult> {
  if (id !== null && !Number.isInteger(id)) return { ok: false, error: "Ugyldig prosjekt" };
  if (id !== null) {
    const exists = await db.project.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return { ok: false, error: "Prosjektet finnes ikke" };
  }
  await db.siteSettings.upsert({ where: { id: 1 }, update: { currentProjectId: id }, create: { id: 1, currentProjectId: id } });
  revalidateSite();
  return { ok: true };
}

export async function writeAbout(v: AboutInput): Promise<void> {
  await db.siteSettings.upsert({ where: { id: 1 }, update: v, create: { id: 1, ...v } });
  revalidatePath("/", "layout");
  revalidatePath("/admin/om-meg");
}

export type TechSpec = { name: string; abbr?: string; roleNo?: string; roleEn?: string };

/**
 * Finds techs by name (case-insensitive) and creates the missing ones in the shared list.
 * Returns the ids in the same order as the input.
 */
export async function resolveTechs(specs: TechSpec[]): Promise<number[]> {
  const existing = await db.tech.findMany();
  const ids: number[] = [];
  for (const s of specs) {
    const name = s.name.trim();
    let tech = existing.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!tech) {
      tech = await db.tech.create({ data: { name, abbr: (s.abbr || techAbbr(name)).slice(0, 4), roleNo: s.roleNo ?? "", roleEn: s.roleEn ?? "" } });
      existing.push(tech);
    }
    ids.push(tech.id);
  }
  return ids;
}
