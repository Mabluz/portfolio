"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { projectSchema, techSchema } from "@/lib/validation";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const revalidateSite = () => revalidatePath("/", "layout");

/** Creates an empty draft right away so images can be uploaded against a real id. */
export async function createProject() {
  await requireAdmin();
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
  redirect(`/admin/prosjekter/${project.id}`);
}

export async function saveProject(id: number, raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige data" };
  }
  const v = parsed.data;

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
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteProject(id: number) {
  await requireAdmin();
  const images = await db.projectImage.findMany({ where: { projectId: id }, select: { path: true } });
  await db.project.delete({ where: { id } });
  await Promise.all(images.map((i) => deleteUpload(i.path)));
  revalidateSite();
  redirect("/admin");
}

export async function reorderProjects(ids: number[]): Promise<ActionResult> {
  await requireAdmin();
  if (!Array.isArray(ids) || ids.some((i) => !Number.isInteger(i))) return { ok: false, error: "Ugyldig rekkefølge" };
  await db.$transaction(ids.map((id, i) => db.project.update({ where: { id }, data: { sortOrder: i } })));
  revalidateSite();
  revalidatePath("/admin");
  return { ok: true };
}

/** Chooses the project shown in the hero card on the front page, or none (null). */
export async function setHeroProject(id: number | null): Promise<ActionResult> {
  await requireAdmin();
  if (id !== null && !Number.isInteger(id)) return { ok: false, error: "Ugyldig prosjekt" };
  if (id !== null) {
    const exists = await db.project.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return { ok: false, error: "Prosjektet finnes ikke" };
  }
  await db.siteSettings.upsert({ where: { id: 1 }, update: { currentProjectId: id }, create: { id: 1, currentProjectId: id } });
  revalidateSite();
  revalidatePath("/admin");
  return { ok: true };
}

export type UploadedImage ={ id: number; path: string; width: number; height: number };

/**
 * Saves the images one by one. If one fails, the ones already saved are still returned along with
 * the error, so the editor shows them instead of leaving invisible rows behind.
 */
export async function uploadProjectImages(projectId: number, formData: FormData): Promise<{ images: UploadedImage[]; error?: string }> {
  await requireAdmin();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { images: [], error: "Ingen filer valgt" };
  const last = await db.projectImage.aggregate({ where: { projectId }, _max: { sortOrder: true } });
  let order = (last._max.sortOrder ?? -1) + 1;
  const images: UploadedImage[] = [];
  let error: string | undefined;
  for (const file of files) {
    let savedPath: string | undefined;
    try {
      const saved = await saveImage(file, `projects/${projectId}`);
      savedPath = saved.path;
      const sortOrder = order++;
      const row = await db.projectImage.create({ data: { projectId, ...saved, sortOrder, galleryWidth: sortOrder === 0 ? "FULL" : "HALF" } });
      images.push({ id: row.id, path: row.path, width: row.width, height: row.height });
    } catch (e) {
      // The file may be on disk without a row; remove it so nothing is orphaned
      if (savedPath) await deleteUpload(savedPath).catch(() => {});
      error = `${file.name}: ${e instanceof Error ? e.message : "Opplasting feilet"}`;
      break;
    }
  }
  if (images.length > 0) revalidateSite();
  return { images, error };
}

export async function deleteProjectImage(projectId: number, imageId: number): Promise<ActionResult> {
  await requireAdmin();
  const img = await db.projectImage.findFirst({ where: { id: imageId, projectId } });
  if (!img) return { ok: false, error: "Fant ikke bildet" };
  await db.projectImage.delete({ where: { id: img.id } });
  await deleteUpload(img.path);
  revalidateSite();
  return { ok: true };
}

export async function createTech(raw: unknown): Promise<ActionResult<{ tech: { id: number; name: string; abbr: string; roleNo: string; roleEn: string } }>> {
  await requireAdmin();
  const parsed = techSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige data" };
  const existing = await db.tech.findUnique({ where: { name: parsed.data.name } });
  if (existing) return { ok: true, tech: existing };
  const tech = await db.tech.create({ data: parsed.data });
  return { ok: true, tech };
}

