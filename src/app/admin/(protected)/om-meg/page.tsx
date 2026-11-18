import { AboutForm } from "@/components/admin/AboutForm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Forside, om meg og CV" };

export default async function AboutAdminPage() {
  await requireAdmin();
  const [s, projects] = await Promise.all([
    getSettings(),
    db.project.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { translations: { where: { locale: "no" } } } }),
  ]);
  return (
    <AboutForm
      projects={projects.map((p) => ({ id: p.id, title: p.translations[0]?.title || p.slug, published: p.status === "PUBLISHED" }))}
      initial={{
        currentProjectId: s.currentProjectId, nowTextNo: s.nowTextNo, nowTextEn: s.nowTextEn,
        aboutLeadNo: s.aboutLeadNo, aboutLeadEn: s.aboutLeadEn, aboutBodyNo: s.aboutBodyNo, aboutBodyEn: s.aboutBodyEn,
        email: s.email, githubUrl: s.githubUrl, linkedinUrl: s.linkedinUrl, tools: s.tools,
        photoPath: s.photoPath, cvPath: s.cvPath, cvUpdated: s.cvUpdatedAt?.toISOString() ?? null,
      }}
    />
  );
}
