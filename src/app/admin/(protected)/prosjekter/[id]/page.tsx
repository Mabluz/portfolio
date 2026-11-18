import { notFound } from "next/navigation";
import { ProjectEditor, type EditorData } from "@/components/admin/ProjectEditor";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectInclude } from "@/lib/queries";

export const metadata = { title: "Rediger prosjekt" };

export default async function EditProjectPage({ params }: PageProps<"/admin/prosjekter/[id]">) {
  await requireAdmin();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();

  const [project, techs] = await Promise.all([
    db.project.findUnique({ where: { id }, include: projectInclude }),
    db.tech.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  const tr = (locale: "no" | "en") => {
    const t = project.translations.find((x) => x.locale === locale);
    return { title: t?.title ?? "", tagline: t?.tagline ?? "", description: t?.description ?? "", why: t?.why ?? "", learned: t?.learned ?? "", role: t?.role ?? "" };
  };

  const initial: EditorData = {
    id: project.id, slug: project.slug, type: project.type, status: project.status, progress: project.progress,
    year: project.year, liveUrl: project.liveUrl ?? "", githubUrl: project.githubUrl ?? "",
    translations: { no: tr("no"), en: tr("en") },
    images: project.images.map((i) => ({ id: i.id, path: i.path, width: i.width, height: i.height, galleryWidth: i.galleryWidth, captionNo: i.captionNo, captionEn: i.captionEn })),
    techs: project.techs.map((t) => ({ techId: t.techId, whyNo: t.whyNo, whyEn: t.whyEn })),
    lessons: project.lessons.map((l) => ({ headNo: l.headNo, bodyNo: l.bodyNo, headEn: l.headEn, bodyEn: l.bodyEn })),
  };

  return <ProjectEditor key={project.id} initial={initial} allTechs={techs} />;
}
