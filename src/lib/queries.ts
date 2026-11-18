import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const projectInclude = {
  translations: true,
  images: { orderBy: { sortOrder: "asc" } },
  techs: { include: { tech: true }, orderBy: { sortOrder: "asc" } },
  lessons: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProjectInclude;

export type FullProject = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export function tr(p: FullProject, locale: "no" | "en") {
  return p.translations.find((t) => t.locale === locale);
}

export function publishedProjects(): Promise<FullProject[]> {
  return db.project.findMany({
    where: { status: "PUBLISHED" },
    include: projectInclude,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export function projectBySlug(slug: string, includeDrafts: boolean): Promise<FullProject | null> {
  return db.project.findFirst({
    where: { slug, ...(includeDrafts ? {} : { status: "PUBLISHED" }) },
    include: projectInclude,
  });
}

export async function getSettings() {
  return db.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** Next published project after `id` in display order (wraps around). Null if there is no other. */
export async function nextProject(id: number): Promise<FullProject | null> {
  const all = await publishedProjects();
  if (all.filter((p) => p.id !== id).length === 0) return null;
  const idx = all.findIndex((p) => p.id === id);
  return all[(idx + 1) % all.length];
}

export function imageUrl(path: string | null | undefined): string | null {
  return path ? `/uploads/${path}` : null;
}
