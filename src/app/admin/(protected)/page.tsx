import Link from "next/link";
import { ProjectTable, type Row } from "@/components/admin/ProjectTable";
import { Plus } from "@/components/ui/Icons";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/queries";
import { createProject } from "@/server/actions/projects";

export const metadata = { title: "Prosjekter" };

const fmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminHome() {
  const admin = await requireAdmin();
  const [projects, settings] = await Promise.all([
    db.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { translations: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, techs: { include: { tech: true } }, _count: { select: { images: true } } },
    }),
    db.siteSettings.findUnique({ where: { id: 1 } }),
  ]);

  const rows: Row[] = projects.map((p) => {
    const no = p.translations.find((t) => t.locale === "no");
    const en = p.translations.find((t) => t.locale === "en");
    const n = p._count.images;
    return {
      id: p.id, slug: p.slug, type: p.type, status: p.status,
      title: no?.title || "(uten tittel)",
      sub: `${n} ${n === 1 ? "bilde" : "bilder"}${p.techs.length ? " · " + p.techs.slice(0, 3).map((t) => t.tech.name).join(", ") : ""}`,
      langs: en?.title ? "NO · EN" : "NO",
      updated: fmt.format(p.updatedAt),
      thumb: imageUrl(p.images[0]?.path),
    };
  });
  const count = (fn: (r: Row) => boolean) => String(rows.filter(fn).length);
  const stats = [
    ["Store prosjekter", count((r) => r.type === "BIG")],
    ["Småprosjekter", count((r) => r.type === "SMALL")],
    ["Publisert", count((r) => r.status === "PUBLISHED")],
    ["Utkast", count((r) => r.status === "DRAFT")],
  ];

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 mb-1.5 font-mono text-[13px] text-forest">Hei, {admin.username}</p>
          <h1 className="font-serif m-0 text-[40px] font-medium">Prosjekter</h1>
        </div>
        <form action={createProject}>
          <button type="submit" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-forest px-[18px] text-sm font-semibold text-sand hover:bg-forest-dark">
            <Plus />Nytt prosjekt
          </button>
        </form>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-admin-line bg-paper px-5 py-[18px]">
            <p className="m-0 mb-1.5 text-[13px] text-muted-2">{label}</p>
            <p className="font-serif m-0 text-[32px] font-medium">{value}</p>
          </div>
        ))}
      </div>
      <ProjectTable initial={rows} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-[18px] rounded-2xl border border-admin-line bg-paper px-6 py-[22px]">
          <div className="min-w-0 flex-1">
            <p className="m-0 font-semibold">Forside, om meg og CV</p>
            <p className="mt-0.5 mb-0 text-sm text-muted-2">Tekst, bilde, verktøy, kontaktlenker og «Akkurat nå»-kortet</p>
          </div>
          <Link href="/admin/om-meg" className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-paper px-[18px] text-sm font-semibold text-ink no-underline hover:border-ink">Rediger</Link>
        </div>
        <div className="flex items-center gap-[18px] rounded-2xl border border-admin-line bg-paper px-6 py-[22px]">
          <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-forest font-mono text-sand">PDF</div>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-semibold">CV</p>
            <p className="mt-0.5 mb-0 font-mono text-[13px] text-muted-2">{settings?.cvPath ? `Lastet opp ${fmt.format(settings.cvUpdatedAt ?? new Date())}` : "Ikke lastet opp"}</p>
          </div>
          <Link href="/admin/om-meg#cv" className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-paper px-[18px] text-sm font-semibold text-ink no-underline hover:border-ink">Last opp ny</Link>
        </div>
      </div>
    </div>
  );
}
