import Link from "next/link";
import { LaptopFrame } from "@/components/ui/LaptopFrame";
import { ArrowRight } from "@/components/ui/Icons";
import { StatusBadge } from "./StatusBadge";
import { StatusLamp } from "./StatusLamp";
import { heroTexts, type Dict, type Progress } from "@/lib/i18n";

type Props = { t: Dict; slug: string; title: string; text: string; image: string | null; tags: string[]; progress: Progress };

/** The featured project in the hero. Label, badge and link text follow the project's status. */
export function NowCard({ t, slug, title, text, image, tags, progress }: Props) {
  const { label, badge, cta } = heroTexts(t, progress);
  return (
    <Link
      href={`/prosjekter/${slug}`}
      className="group relative flex min-h-0 w-full md:min-h-[560px] flex-col rounded-[22px] border-[1.5px] border-ink bg-beige text-ink no-underline shadow-[8px_8px_0_#2B2A24] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[12px_12px_0_#2B2A24]"
    >
      <div className="relative m-3 mb-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[14px] px-[26px] py-[22px] md:min-h-[280px] md:px-10 md:py-7">
        <LaptopFrame src={image} placeholder={t.screenshot} widthClass="w-full" />
      </div>
      <div className="px-7 pt-6 pb-7">
        <div className="mb-3 flex items-center gap-2.5">
          <StatusLamp progress={progress} />
          <span className="font-mono text-xs font-medium tracking-[0.1em] uppercase">{label}</span>
        </div>
        <p className="font-serif m-0 mb-2 text-4xl leading-[1.1] font-medium">{title}</p>
        {text && <p className="m-0 mb-5 text-[17px] leading-relaxed text-[#3f3a2c]">{text}</p>}
        <div className="flex items-center justify-between gap-3 border-t-[1.5px] border-[#c4b48f] pt-3.5">
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border-[1.5px] border-ink px-2.5 py-1 font-mono text-[11px]">{tag}</span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
            {cta}
            <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
      <span aria-hidden="true" className="contents"><StatusBadge progress={progress} label={badge} /></span>
    </Link>
  );
}
