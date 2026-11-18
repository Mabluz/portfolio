export function SectionHeader({ num, title, intro, dark = false }: { num: string; title: string; intro?: string; dark?: boolean }) {
  return (
    <div className={`mb-12 flex flex-wrap items-baseline gap-5 border-t-[1.5px] pt-6 md:mb-16 ${dark ? "border-sand" : "border-ink"}`}>
      <span className={`font-mono text-sm ${dark ? "text-gold" : "text-forest"}`}>{num}</span>
      <h2 className="font-serif m-0 text-[38px] font-medium md:text-[52px]">{title}</h2>
      {intro && <p className={`m-0 max-w-sm text-base md:ml-auto ${dark ? "text-sage" : "text-muted-2"}`}>{intro}</p>}
    </div>
  );
}
