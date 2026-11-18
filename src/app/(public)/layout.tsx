import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LangToggle } from "@/components/ui/LangToggle";
import { StickyHeader } from "@/components/public/StickyHeader";
import { dict, getLang } from "@/lib/i18n";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  const t = dict[lang];
  return (
    <div id="top" className="min-h-screen bg-sand text-ink">
      <StickyHeader>
        <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-6 py-7 md:px-16">
          <Logo />
          <nav aria-label={t.mainMenu} className="hidden items-center gap-7 md:flex">
            {[["/#store", t.navBig], ["/#sma", t.navSmall], ["/#om", t.navAbout]].map(([href, label]) => (
              <Link key={href} href={href} className="px-1 py-3 text-[15px] font-medium text-ink no-underline underline-offset-[6px] decoration-2 hover:text-forest hover:underline">
                {label}
              </Link>
            ))}
          </nav>
          <LangToggle lang={lang} label={t.langLabel} />
        </header>
      </StickyHeader>
      {children}
      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-ink px-6 pt-8 pb-12 md:px-16">
        <p className="m-0 font-mono text-[13px] text-muted-2">{t.footer}</p>
        <Link href="#top" className="py-3 font-mono text-[13px] text-forest">{t.toTop}</Link>
      </footer>
    </div>
  );
}
