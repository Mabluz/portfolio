"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUpload, saveImage, savePdf } from "@/lib/uploads";
import { aboutSchema } from "@/lib/validation";
import type { ActionResult } from "./projects";

const revalidateSite = () => {
  revalidatePath("/", "layout");
  revalidatePath("/admin/om-meg");
};

export async function saveAbout(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = aboutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige data" };
  const { currentProjectId, ...rest } = parsed.data;
  if (currentProjectId !== null) {
    const exists = await db.project.findUnique({ where: { id: currentProjectId }, select: { id: true } });
    if (!exists) return { ok: false, error: "Prosjektet finnes ikke" };
  }
  await db.siteSettings.upsert({
    where: { id: 1 },
    update: { ...rest, currentProjectId },
    create: { id: 1, ...rest, currentProjectId },
  });
  revalidateSite();
  return { ok: true };
}

export async function uploadPhoto(formData: FormData): Promise<ActionResult<{ path: string }>> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Ingen fil valgt" };
  try {
    const saved = await saveImage(file, "about");
    const prev = await db.siteSettings.findUnique({ where: { id: 1 }, select: { photoPath: true } });
    await db.siteSettings.upsert({ where: { id: 1 }, update: { photoPath: saved.path }, create: { id: 1, photoPath: saved.path } });
    await deleteUpload(prev?.photoPath);
    revalidateSite();
    return { ok: true, path: saved.path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Opplasting feilet" };
  }
}

export async function uploadCv(formData: FormData): Promise<ActionResult<{ updatedAt: string }>> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Ingen fil valgt" };
  try {
    const path = await savePdf(file, "cv");
    const prev = await db.siteSettings.findUnique({ where: { id: 1 }, select: { cvPath: true } });
    const now = new Date();
    await db.siteSettings.upsert({ where: { id: 1 }, update: { cvPath: path, cvUpdatedAt: now }, create: { id: 1, cvPath: path, cvUpdatedAt: now } });
    await deleteUpload(prev?.cvPath);
    revalidateSite();
    return { ok: true, updatedAt: now.toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Opplasting feilet" };
  }
}

export async function removeCv(): Promise<ActionResult> {
  await requireAdmin();
  const prev = await db.siteSettings.findUnique({ where: { id: 1 }, select: { cvPath: true } });
  await db.siteSettings.update({ where: { id: 1 }, data: { cvPath: null, cvUpdatedAt: null } });
  await deleteUpload(prev?.cvPath);
  revalidateSite();
  return { ok: true };
}
