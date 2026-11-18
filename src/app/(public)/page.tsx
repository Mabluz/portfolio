import Image from "next/image";
import { NowCard } from "@/components/public/NowCard";
import { BigProjectRow } from "@/components/public/BigProjectRow";
import { SmallProjectCard } from "@/components/public/SmallProjectCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ArrowDown, Download, Mail } from "@/components/ui/Icons";
import { btnGhost, btnGold, btnPrimary } from "@/components/ui/buttons";
import { dict, getLang, pick } from "@/lib/i18n";
import { getSettings, imageUrl, publishedProjects, tr } from "@/lib/queries";

export default async function HomePage() {
  const lang = await getLang();
  const t = dict[lang];
  const [projects, settings] = await Promise.all([publishedProjects(), getSettings()]);

  const text = (p: (typeof projects)[number]) => {
    const no = tr(p, "no");
    const en = tr(p, "en");
    return {
      title: pick(lang, no?.title, en?.title),
      tagline: pick(lang, no?.tagline, en?.tagline),
      why: pick(lang, no?.why, en?.why),
      learned: pick(lang, no?.learned, en?.learned),
      tags: p.techs.map((x) => x.tech.name),
    };
  };

  // The featured project is only shown in the hero; it returns to its list when another is chosen.
  const current = projects.find((p) => p.id === settings.currentProjectId);
  const listed = projects.filter((p) => p.id !== current?.id);
  const big = listed.filter((p) => p.type === "BIG");
  const small = listed.filter((p) => p.type === "SMALL");
  const hasCv = Boolean(settings.cvPath);
  const photo = imageUrl(settings.photoPath);
  const contacts: [string, string][] = [
    [settings.githubUrl, "GitHub"],
    [settings.linkedinUrl, "LinkedIn"],
  ];

  return (
    <main>
      <section className="mx-auto max-w-[1240px] px-6 pt-10 pb-[72px] md:px-16 md:pt-[88px] md:pb-[120px]">
        <div className="grid items-stretch gap-14 md:grid-cols-[6fr_5fr] md:gap-16">
          <div>
            <p className="m-0 mb-7 font-mono text-sm tracking-[0.02em] text-forest">{t.eyebrow}</p>
            <h1 className="font-serif m-0 max-w-[900px] text-[48px] leading-[1.02] font-medium tracking-[-0.02em] md:text-[68px]">
              {t.heroA}{" "}
              {t.heroB.split(" ").map((w, i, all) => (
                <span key={i} className="relative inline-block whitespace-nowrap text-forest" style={{ marginRight: i < all.length - 1 ? "0.25em" : 0 }}>
                  {w}
                  <svg viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-[18px] left-0 h-4" style={{ width: i < all.length - 1 ? "calc(100% + 0.25em)" : "100%" }}>
                    <path d={["M0 8 C 30 2, 55 13, 92 7 S 150 2, 200 8","M0 8 C 40 13, 70 2, 115 8 S 170 13, 200 8","M0 8 C 25 3, 70 13, 105 7 S 165 3, 200 8"][i % 3]} fill="none" stroke="#E3B744" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              ))}
              {t.heroC}
            </h1>
            <p className="mt-9 mb-0 max-w-[620px] text-xl leading-relaxed text-muted">{t.heroSub}</p>
            <div className="mt-10 flex flex-wrap gap-3.5">
              <a className={btnPrimary} href="#store">{t.ctaProjects}<ArrowDown /></a>
              <a className={btnGhost} href="#om">{t.ctaAbout}</a>
              {hasCv && <a className={btnGold} href="/cv"><Download />{t.cv}</a>}
            </div>
          </div>
          {current && (
            <NowCard
              t={t}
              slug={current.slug}
              title={text(current).title}
              text={text(current).tagline}
              progress={current.progress}
              image={imageUrl(current.images[0]?.path)}
              tags={text(current).tags}
            />
          )}
        </div>
      </section>

      {big.length > 0 && (
        <section id="store" className="mx-auto scroll-mt-16 max-w-[1240px] px-6 pt-10 pb-24 md:px-16 md:pb-[120px]">
          <SectionHeader num="01" title={t.bigTitle} intro={t.bigIntro} />
          <div className="flex flex-col gap-24">
            {big.map((p, i) => {
              const x = text(p);
              return (
                <BigProjectRow
                  key={p.id} t={t} index={i} slug={p.slug} year={p.year} title={x.title} desc={x.tagline}
                  why={x.why} learned={x.learned} tags={x.tags} image={imageUrl(p.images[0]?.path)}
                  liveUrl={p.liveUrl} githubUrl={p.githubUrl}
                />
              );
            })}
          </div>
        </section>
      )}

      {small.length > 0 && (
        <section id="sma" className="bg-forest text-sand">
          <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-16 md:pt-[110px] md:pb-[120px]">
            <SectionHeader num="02" title={t.smallTitle} intro={t.smallIntro} dark />
            <div className="grid gap-6 md:grid-cols-3">
              {small.map((p, i) => {
                const x = text(p);
                return <SmallProjectCard key={p.id} num={i + 1} slug={p.slug} title={x.title} desc={x.tagline} tags={x.tags.slice(0, 2)} />;
              })}
            </div>
          </div>
        </section>
      )}

      <section id="om" className="mx-auto max-w-[1240px] px-6 py-24 md:px-16 md:py-[120px]">
        <SectionHeader num="03" title={t.aboutTitle} />
        <div className="grid items-start gap-10 md:grid-cols-[5fr_7fr] md:gap-[72px]">
          <div className="relative max-w-[420px]">
            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-t-[200px] rounded-b-3xl border-[1.5px] border-ink bg-[#dcd2bc]">
              {photo && <Image src={photo} alt="Marius" width={840} height={1050} unoptimized className="h-full w-full object-cover" />}
            </div>
          </div>
          <div>
            <p className="font-serif m-0 mb-7 text-[32px] leading-[1.3] font-normal">{pick(lang, settings.aboutLeadNo, settings.aboutLeadEn)}</p>
            <p className="m-0 mb-7 text-lg leading-[1.7] whitespace-pre-line text-muted">{pick(lang, settings.aboutBodyNo, settings.aboutBodyEn)}</p>
            {hasCv && <a className={btnGold} href="/cv"><Download />{t.cv}</a>}
            {settings.tools.length > 0 && (
              <>
                <h3 className="mt-11 mb-4 font-mono text-[13px] font-medium tracking-[0.08em] text-forest uppercase">{t.toolsTitle}</h3>
                <div className="flex flex-wrap gap-2">
                  {settings.tools.map((tool) => <span key={tool} className="rounded-full border-[1.5px] border-ink bg-paper px-4 py-2.5 text-[15px]">{tool}</span>)}
                </div>
              </>
            )}
            <h3 className="mt-11 mb-4 font-mono text-[13px] font-medium tracking-[0.08em] text-forest uppercase">{t.contactTitle}</h3>
            <div className="flex flex-wrap gap-3">
              {settings.email && <a className={btnPrimary} href={`mailto:${settings.email}`}><Mail />{t.email}</a>}
              {contacts.filter(([url]) => url).map(([url, label]) => (
                <a key={label} className={btnGhost} href={url} target="_blank" rel="noopener noreferrer">{label}</a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
