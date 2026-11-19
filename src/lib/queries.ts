import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma, SiteSettings } from "@/generated/prisma/client";

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

/** Cached per request, so generateMetadata and the page share one query. */
export const projectBySlug = cache((slug: string, includeDrafts: boolean): Promise<FullProject | null> =>
  db.project.findFirst({
    where: { slug, ...(includeDrafts ? {} : { status: "PUBLISHED" }) },
    include: projectInclude,
  }),
);

// Matches the column defaults in the schema; used until the row has been written once.
export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1, currentProjectId: null, nowTextNo: "", nowTextEn: "", aboutLeadNo: "", aboutLeadEn: "",
  aboutBodyNo: "", aboutBodyEn: "", photoPath: null, cvPath: null, cvUpdatedAt: null,
  email: "", githubUrl: "", linkedinUrl: "", tools: [],
};

/** Read-only: the row is created by the actions in server/actions/about.ts, which all upsert. */
export const getSettings = cache(async (): Promise<SiteSettings> =>
  (await db.siteSettings.findUnique({ where: { id: 1 } })) ?? DEFAULT_SETTINGS,
);

export type NextProject = { slug: string; translations: { locale: string; title: string }[] };

/** Next published project after `id` in display order (wraps around). Null if there is no other. */
export async function nextProject(id: number): Promise<NextProject | null> {
  const all = await db.project.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, translations: { select: { locale: true, title: true } } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  if (!all.some((p) => p.id !== id)) return null;
  const idx = all.findIndex((p) => p.id === id);
  return all[(idx + 1) % all.length];
}

export function imageUrl(path: string | null | undefined): string | null {
  return path ? `/uploads/${path}` : null;
}
