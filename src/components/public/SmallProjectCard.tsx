import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/Icons";

type Props = { num: number; slug: string; title: string; desc: string; tags: string[] };

export function SmallProjectCard({ num, slug, title, desc, tags }: Props) {
  return (
    <Link
      href={`/prosjekter/${slug}`}
      className="flex min-h-[200px] flex-col gap-3.5 rounded-2xl bg-sage p-[26px] text-ink no-underline transition-all duration-200 hover:-translate-y-[3px] hover:-rotate-[1.2deg] hover:shadow-[6px_6px_0_#C9962B]"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-forest">#{String(num).padStart(2, "0")}</span>
        <ArrowUpRight size={18} className="text-forest" />
      </div>
      <h3 className="font-serif m-0 text-[26px] leading-[1.15] font-medium">{title}</h3>
      <p className="m-0 grow text-[15px] leading-normal text-muted">{desc}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => <span key={tag} className="rounded-full border border-[#6f8a78] px-2.5 py-1 font-mono text-[11px]">{tag}</span>)}
        </div>
      )}
    </Link>
  );
}
