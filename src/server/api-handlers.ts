import "server-only";
import {
  aboutPatchSchema, ApiError, blankApiProject, mergeAbout, mergeProject, patchSummary, projectPatchSchema,
  toApiAbout, toApiProject, toApiProjectSummary,
} from "@/lib/api-format";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, projectInclude } from "@/lib/queries";
import { createDraftProject, resolveTechs, writeAbout, writeHeroProject, writeProject } from "@/server/project-service";

/** The logic behind /api/v1, kept apart from the route files so it can be tested directly. */

async function findProject(ref: string) {
  const where = /^\d+$/.test(ref) ? { id: Number(ref) } : { slug: ref };
  const project = await db.project.findUnique({ where, include: projectInclude });
  if (!project) throw new ApiError(404, `Fant ikke prosjektet «${ref}»`);
  return project;
}

export async function listProjects() {
  const all = await db.project.findMany({ include: projectInclude, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  return all.map(toApiProjectSummary);
}

export async function getProject(ref: string) {
  return toApiProject(await findProject(ref));
}

export async function updateProject(ref: string, body: unknown) {
  const patch = projectPatchSchema.parse(body);
  const project = await findProject(ref);
  const { input, techs } = mergeProject(toApiProject(project), patch);
  // Validation passed, so it's now safe to add unknown techs to the shared list
  const ids = await resolveTechs(techs);
  input.techs = input.techs.map((t, i) => ({ ...t, techId: ids[i] }));
  const res = await writeProject(project.id, input);
  if (!res.ok) throw new ApiError(409, res.error);
  return { project: await getProject(String(project.id)), audit: `Endret prosjekt ${project.id} (${input.slug}): ${patchSummary(patch)}` };
}

export async function createProject(body: unknown) {
  const patch = projectPatchSchema.parse(body);
  if (patch.images?.length) throw new ApiError(400, "images: et nytt prosjekt har ingen bilder. Last opp bilder i admin.");
  // Validate against an empty project before anything is created
  const { input } = mergeProject(blankApiProject(), patch);
  if (!patch.slug && !patch.no?.title) throw new ApiError(400, "Oppgi minst no.title eller slug");
  const clash = await db.project.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (clash) throw new ApiError(409, `Adressen «${input.slug}» brukes av et annet prosjekt`);
  const draft = await createDraftProject();
  const updated = await updateProject(String(draft.id), { ...patch, slug: input.slug });
  return { project: updated.project, audit: `Opprettet prosjekt ${draft.id} (${input.slug}): ${patchSummary(patch)}` };
}

export async function getAbout() {
  // Read directly, not via the request-cached getSettings, so a PATCH returns the new values
  const settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  return toApiAbout(settings ?? DEFAULT_SETTINGS);
}

export async function updateAbout(body: unknown) {
  const patch = aboutPatchSchema.parse(body);
  const input = mergeAbout(await getAbout(), patch);
  if (patch.heroProjectId !== undefined) {
    const res = await writeHeroProject(patch.heroProjectId);
    if (!res.ok) throw new ApiError(400, `heroProjectId: ${res.error}`);
  }
  await writeAbout(input);
  return { about: await getAbout(), audit: `Endret om meg: ${patchSummary(patch)}` };
}

export async function listTechs() {
  const techs = await db.tech.findMany({ orderBy: { name: "asc" } });
  return techs.map((t) => ({ name: t.name, abbr: t.abbr, roleNo: t.roleNo, roleEn: t.roleEn }));
}
