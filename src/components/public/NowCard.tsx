import Link from "next/link";
import { LaptopFrame } from "@/components/ui/LaptopFrame";
import { ArrowRight } from "@/components/ui/Icons";
import type { Dict } from "@/lib/i18n";

type Props = { t: Dict; slug: string; title: string; text: string; image: string | null; tags: string[] };

export function NowCard({ t, slug, title, text, image, tags }: Props) {
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
          <span className="pulse-dot" aria-hidden="true" />
          <span className="font-mono text-xs font-medium tracking-[0.1em] uppercase">{t.nowLabel}</span>
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
            {t.nowCta}
            <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
      <span aria-hidden="true" className="font-serif absolute -top-[30px] -right-[26px] box-border flex h-[92px] w-[92px] rotate-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-gold p-2.5 text-center text-[19px] leading-[1.05] font-semibold italic">
        {t.nowBadge}
      </span>
    </Link>
  );
}
