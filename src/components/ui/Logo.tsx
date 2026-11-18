import Link from "next/link";

export function LogoMark({ size = 34, bg = "#1F4D3A", fg = "#F3EEE3", accent = "#E3B744" }: { size?: number; bg?: string; fg?: string; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect width="34" height="34" rx="9" fill={bg} />
      <path d="M12.5 11.5L7 17l5.5 5.5M21.5 11.5L27 17l-5.5 5.5" fill="none" stroke={fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.6 10l-3.2 14" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-ink no-underline">
      <LogoMark />
      <span className="font-serif text-2xl font-semibold">Marius</span>
    </Link>
  );
}
