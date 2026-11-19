"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { projectSchema, techSchema } from "@/lib/validation";
import { createDraftProject, revalidateSite, writeHeroProject, writeProject } from "@/server/project-service";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Creates an empty draft right away so images can be uploaded against a real id. */
export async function createProject() {
  await requireAdmin();
  const project = await createDraftProject();
  redirect(`/admin/prosjekter/${project.id}`);
}

export async function saveProject(id: number, raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige data" };
  }
  return writeProject(id, parsed.data);
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
  return writeHeroProject(id);
}

export type UploadedImage = { id: number; path: string; width: number; height: number };

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

