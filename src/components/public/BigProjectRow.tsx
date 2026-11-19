import Link from "next/link";
import { LaptopFrame } from "@/components/ui/LaptopFrame";
import { Reveal } from "./Parallax";
import { ArrowRight, ArrowUpRight, Github } from "@/components/ui/Icons";
import { btnGhost, btnPrimary } from "@/components/ui/buttons";
import { progressLabel, type Dict, type Progress } from "@/lib/i18n";
import { StatusPill } from "./StatusLamp";

type Props = {
  t: Dict; index: number; slug: string; year: string; title: string; desc: string; why: string; learned: string;
  tags: string[]; image: string | null; liveUrl: string | null; githubUrl: string | null; progress: Progress;
};

export function BigProjectRow({ t, index, slug, year, title, desc, why, learned, tags, image, liveUrl, githubUrl, progress }: Props) {
  return (
    <article className={`flex flex-col items-stretch gap-7 transition-transform duration-300 hover:-translate-y-1 md:items-center md:gap-14 ${index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"}`}>
      <div className="relative flex aspect-[16/11] min-w-0 flex-1 items-center justify-center">
        {/* The screenshot drifts slowly inside the laptop screen */}
        <LaptopFrame src={image} alt={title} placeholder={t.screenshot} parallax />
      </div>
      <Reveal className="min-w-0 flex-1">
        <p className="m-0 mb-3.5 flex flex-wrap items-center gap-2.5 font-mono text-[13px] text-forest">
          <span>{String(index + 1).padStart(2, "0")}{year && ` · ${year}`}</span>
          <StatusPill progress={progress} label={progressLabel(t, progress)} />
        </p>
        <h3 className="font-serif m-0 mb-4 text-4xl leading-[1.1] font-medium md:text-[40px]">{title}</h3>
        {desc && <p className="m-0 mb-6 text-lg leading-relaxed text-muted">{desc}</p>}
        {(why || learned) && (
          <div className="mb-6 flex flex-col gap-2.5 pl-4">
            {why && <p className="m-0 text-[15px] leading-normal"><span className="font-mono text-forest">{t.why}</span> {why}</p>}
            {learned && <p className="m-0 text-[15px] leading-normal"><span className="font-mono text-forest">{t.learned}</span> {learned}</p>}
          </div>
        )}
        {tags.length > 0 && (
          <div className="mb-7 flex flex-wrap gap-2">
            {tags.map((tag) => <span key={tag} className="rounded-full bg-tag px-3 py-1.5 font-mono text-xs">{tag}</span>)}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {liveUrl && <a className={btnPrimary} href={liveUrl} target="_blank" rel="noopener noreferrer">{t.demo}<ArrowUpRight /></a>}
          <Link className={btnGhost} href={`/prosjekter/${slug}`}>{t.readMore}<ArrowRight /></Link>
          {githubUrl && <a className={btnGhost} href={githubUrl} target="_blank" rel="noopener noreferrer"><Github />GitHub</a>}
        </div>
      </Reveal>
    </article>
  );
}
