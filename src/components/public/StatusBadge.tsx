import type { Progress } from "@/lib/i18n";

type Props = { progress: Progress; label: string };

// Tilts back a little and grows when the card is hovered (springy ease like the design)
const motion = "transition-[rotate,scale] duration-300 ease-[cubic-bezier(.3,1.6,.5,1)] group-hover:scale-[1.04]";
const corner = "absolute max-md:right-[-10px]";

/** The sticker on the corner of the hero card. Each status has its own graphic. */
export function StatusBadge({ progress, label }: Props) {
  switch (progress) {
    case "IN_PROGRESS":
      return (
        <span aria-hidden="true" className={`${corner} ${motion} -top-[18px] -right-[34px] block overflow-hidden border-[1.5px] border-ink bg-gold shadow-[4px_4px_0_#2B2A24] rotate-[9deg] group-hover:rotate-[4deg]`}>
          <span aria-hidden="true" className="tape-stripes block h-[7px] border-b-[1.5px] border-ink" />
          <span className="flex items-center gap-2.5 px-[22px] py-[7px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B2A24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" /></svg>
            <span className="font-mono text-sm font-medium tracking-[0.14em] whitespace-nowrap uppercase">{label}</span>
          </span>
          <span aria-hidden="true" className="tape-stripes block h-[7px] border-t-[1.5px] border-ink" />
        </span>
      );
    case "LIVE":
      return (
        <span aria-hidden="true" className={`${corner} ${motion} -top-5 -right-6 flex items-center gap-2.5 rounded-full border-[1.5px] border-ink bg-forest py-[11px] pr-5 pl-4 text-sand shadow-[4px_4px_0_#2B2A24] -rotate-6 group-hover:-rotate-3`}>
          <span aria-hidden="true" className="live-dot" />
          <span className="font-mono text-[15px] font-medium tracking-[0.14em] whitespace-nowrap uppercase">{label}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E3B744" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5" /></svg>
        </span>
      );
    case "ABANDONED":
      return (
        <span aria-hidden="true" className={`${corner} ${motion} -top-[30px] -right-[22px] box-border flex w-[150px] flex-col items-center gap-1.5 border-[1.5px] border-ink bg-[#F4E4B4] px-4 pt-[22px] pb-4 text-ink shadow-[4px_4px_0_#2B2A24] -rotate-[7deg] group-hover:-rotate-[3.5deg]`}>
          <span aria-hidden="true" className="absolute -top-[11px] left-1/2 -ml-[29px] h-5 w-[58px] rotate-[5deg] border border-dashed border-[#8A8370] bg-[rgba(255,253,247,0.8)]" />
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2B2A24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V4" /><path d="M5 4c3-1.5 5 1.5 8 0s4-1 6 0v9c-2-1-3-1.5-6 0s-5-1.5-8 0" fill="#FFFDF7" /></svg>
          <span className="font-serif text-2xl leading-none">{label}</span>
        </span>
      );
    case "DISCONTINUED":
      return (
        <span aria-hidden="true" className={`${corner} ${motion} -top-[18px] -right-7 block rounded-[9px] border-[3px] border-[#B5502F] bg-[rgba(243,238,227,0.92)] p-1 text-[#B5502F] -rotate-12 group-hover:-rotate-6`}>
          <span className="flex items-center gap-[9px] rounded-[5px] border-[1.5px] border-[#B5502F] px-4 py-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B5502F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" /></svg>
            <span className="font-mono text-[15px] font-medium tracking-[0.18em] whitespace-nowrap uppercase">{label}</span>
          </span>
        </span>
      );
  }
}
