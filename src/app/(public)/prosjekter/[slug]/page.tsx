import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LaptopFrame } from "@/components/ui/LaptopFrame";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github } from "@/components/ui/Icons";
import { btnGhost, btnPrimary } from "@/components/ui/buttons";
import { getAdmin } from "@/lib/auth";
import { dict, getLang, pick, progressLabel } from "@/lib/i18n";
import { imageUrl, nextProject, projectBySlug, tr } from "@/lib/queries";

const SPAN = { FULL: "md:col-span-6", HALF: "md:col-span-3", THIRD: "md:col-span-2" } as const;
const RATIO = { FULL: "21 / 9", HALF: "16 / 10", THIRD: "4 / 3" } as const;

export async function generateMetadata({ params }: PageProps<"/prosjekter/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lang = await getLang();
  const project = await projectBySlug(slug, Boolean(await getAdmin()));
  if (!project) return {};
  const no = tr(project, "no");
  const en = tr(project, "en");
  const image = imageUrl(project.images[0]?.path);
  return {
    title: pick(lang, no?.title, en?.title),
    description: pick(lang, no?.tagline, en?.tagline),
    openGraph: image ? { images: [image] } : undefined,
  };
}

export default async function ProjectPage({ params }: PageProps<"/prosjekter/[slug]">) {
  const { slug } = await params;
  const lang = await getLang();
  const t = dict[lang];
  const project = await projectBySlug(slug, Boolean(await getAdmin()));
  if (!project) notFound();

  const no = tr(project, "no");
  const en = tr(project, "en");
  const txt = (k: "title" | "tagline" | "description" | "why" | "learned" | "role") => pick(lang, no?.[k], en?.[k]);
  const next = await nextProject(project.id);
  const nextTitle = (locale: string) => next?.translations.find((x) => x.locale === locale)?.title;
  const nextText = next && pick(lang, nextTitle("no"), nextTitle("en"));

  const [hero, ...rest] = project.images;
  const meta: [string, string][] = [
    [t.metaRole, txt("role")],
    [t.metaYear, project.year],
    [t.metaStatus, progressLabel(t, project.progress)],
    [t.metaType, project.type === "BIG" ? t.typeBig : t.typeSmall],
  ];
  const visibleMeta = meta.filter(([, v]) => v);
  const description = txt("description");
  const learned = txt("learned");
  const why = txt("why");

  return (
    <main>
      <section className="mx-auto max-w-[1240px] px-6 pt-10 pb-14 md:px-16 md:pt-[72px]">
        <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-ink no-underline hover:text-forest">
          <ArrowLeft />{t.back}
        </Link>
        {project.status !== "PUBLISHED" && (
          <p className="mb-6 w-fit rounded-full bg-[#f3e7d2] px-3 py-1 font-mono text-xs text-[#6e4a14]">
            {project.status === "DRAFT" ? "Utkast - bare synlig for deg" : "Skjult"}
          </p>
        )}
        <p className="m-0 mb-6 font-mono text-sm text-forest">
          {project.type === "BIG" ? t.eyebrowBig : t.eyebrowSmall}{project.year && ` · ${project.year}`}
        </p>
        <h1 className="font-serif m-0 mb-6 text-5xl leading-none font-medium tracking-[-0.02em] md:text-[96px]">{txt("title")}</h1>
        {txt("tagline") && <p className="m-0 mb-10 max-w-[720px] text-[22px] leading-relaxed text-muted">{txt("tagline")}</p>}
        <div className="flex flex-wrap gap-3">
          {project.liveUrl && <a className={btnPrimary} href={project.liveUrl} target="_blank" rel="noopener noreferrer">{t.live}<ArrowUpRight /></a>}
          {project.githubUrl && <a className={btnGhost} href={project.githubUrl} target="_blank" rel="noopener noreferrer"><Github />GitHub</a>}
        </div>
      </section>

      {visibleMeta.length > 0 && (
        <section className="mx-auto max-w-[1240px] px-6 pb-12 md:px-16">
          <dl className="m-0 grid grid-cols-2 border-y-[1.5px] border-ink md:grid-cols-4">
            {visibleMeta.map(([label, value]) => (
              <div key={label} className="py-[22px] pr-5">
                <dt className="mb-2 font-mono text-xs tracking-[0.08em] text-forest uppercase">{label}</dt>
                <dd className="m-0 text-[17px] font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mx-auto max-w-[1240px] px-6 pt-6 pb-24 md:px-16 md:pb-28">
        <div className="flex justify-center py-4">
          <LaptopFrame src={imageUrl(hero?.path)} width={hero?.width} height={hero?.height} alt={txt("title")} placeholder={t.screenshot} widthClass="w-[84%]" />
        </div>
      </section>

      {(description || why) && (
        <section className="mx-auto max-w-[1240px] px-6 pb-24 md:px-16 md:pb-28">
          <div className="grid gap-7 md:grid-cols-[4fr_8fr] md:gap-16">
            <div>
              <p className="m-0 mb-3 font-mono text-sm text-forest">01</p>
              <h2 className="font-serif m-0 text-4xl leading-[1.1] font-medium md:text-[44px]">{t.aboutProject}</h2>
            </div>
            <div className="text-lg leading-[1.75] text-muted">
              {description && <p className="m-0 mb-4 whitespace-pre-line">{description}</p>}
              {why && <p className="m-0 whitespace-pre-line">{why}</p>}
            </div>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="mx-auto max-w-[1240px] px-6 pb-24 md:px-16 md:pb-28">
          <div className="mb-10 flex items-baseline gap-5 border-t-[1.5px] border-ink pt-6">
            <span className="font-mono text-sm text-forest">02</span>
            <h2 className="font-serif m-0 text-4xl font-medium md:text-[44px]">{t.gallery}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-6">
            {rest.map((img) => {
              const caption = pick(lang, img.captionNo, img.captionEn);
              return (
                <figure key={img.id} className={`m-0 ${SPAN[img.galleryWidth]}`}>
                  <div className="relative overflow-hidden rounded-[18px] border-[1.5px] border-ink bg-paper" style={{ aspectRatio: RATIO[img.galleryWidth] }}>
                    <Image src={imageUrl(img.path)!} alt={caption} width={img.width} height={img.height} unoptimized className="h-full w-full object-cover object-top" />
                  </div>
                  {caption && <figcaption className="mt-3 text-sm text-muted-2">{caption}</figcaption>}
                </figure>
              );
            })}
          </div>
        </section>
      )}

      {project.techs.length > 0 && (
        <section className="mx-auto max-w-[1240px] px-6 pb-24 md:px-16 md:pb-28">
          <div className="mb-4 flex items-baseline gap-5 border-t-[1.5px] border-ink pt-6">
            <span className="font-mono text-sm text-forest">03</span>
            <h2 className="font-serif m-0 text-4xl font-medium md:text-[44px]">{t.techTitle}</h2>
          </div>
          <p className="m-0 mb-10 max-w-[620px] text-[17px] text-muted-2">{t.techIntro}</p>
          <div className="grid gap-5 md:grid-cols-2">
            {project.techs.map(({ tech, whyNo, whyEn }) => (
              <div key={tech.id} className="flex items-start gap-5 rounded-2xl border-[1.5px] border-ink bg-paper p-7">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-forest font-mono text-[15px] font-medium text-sand">{tech.abbr}</div>
                <div>
                  <p className="m-0 mb-1 font-mono text-xs tracking-[0.08em] text-forest uppercase">{pick(lang, tech.roleNo, tech.roleEn)}</p>
                  <h3 className="font-serif m-0 mb-2.5 text-[26px] font-medium">{tech.name}</h3>
                  {pick(lang, whyNo, whyEn) && <p className="m-0 text-base leading-relaxed text-muted">{pick(lang, whyNo, whyEn)}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(project.lessons.length > 0 || learned) && (
        <section className="mx-auto max-w-[1240px] px-6 pb-28 md:px-16 md:pb-[120px]">
          <div className="mb-10 flex items-baseline gap-5 border-t-[1.5px] border-ink pt-6">
            <span className="font-mono text-sm text-forest">04</span>
            <h2 className="font-serif m-0 text-4xl font-medium md:text-[44px]">{t.learnTitle}</h2>
          </div>
          {project.lessons.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-3">
              {project.lessons.map((l, i) => (
                <div key={l.id}>
                  <p className="font-serif m-0 mb-3 text-[56px] leading-none text-[#c9a96e] italic">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="m-0 mb-2.5 text-[19px] font-semibold">{pick(lang, l.headNo, l.headEn)}</h3>
                  <p className="m-0 text-base leading-relaxed whitespace-pre-line text-muted">{pick(lang, l.bodyNo, l.bodyEn)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 max-w-[720px] text-lg leading-[1.75] whitespace-pre-line text-muted">{learned}</p>
          )}
        </section>
      )}

      {next && (
        <section className="bg-forest">
          <div className="mx-auto max-w-[1240px] px-6 py-[72px] md:px-16">
            <Link href={`/prosjekter/${next.slug}`} className="group flex items-center justify-between gap-6 text-sand no-underline hover:text-sand">
              <div>
                <p className="m-0 mb-3 font-mono text-[13px] tracking-[0.08em] text-[#c9a96e] uppercase">{t.nextLabel}</p>
                <p className="font-serif m-0 text-4xl leading-[1.05] font-medium md:text-[56px]">{nextText}</p>
              </div>
              <ArrowRight size={64} className="shrink-0 transition-transform group-hover:translate-x-2" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
