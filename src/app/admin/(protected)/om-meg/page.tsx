import { AboutForm } from "@/components/admin/AboutForm";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Forside, om meg og CV" };

export default async function AboutAdminPage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <AboutForm
      initial={{
        aboutLeadNo: s.aboutLeadNo, aboutLeadEn: s.aboutLeadEn, aboutBodyNo: s.aboutBodyNo, aboutBodyEn: s.aboutBodyEn,
        email: s.email, githubUrl: s.githubUrl, linkedinUrl: s.linkedinUrl, tools: s.tools,
        photoPath: s.photoPath, cvPath: s.cvPath, cvUpdated: s.cvUpdatedAt?.toISOString() ?? null,
      }}
    />
  );
}
