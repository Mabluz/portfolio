"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import { logout } from "@/server/actions/auth";

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const link = "flex min-h-11 items-center gap-3 rounded-[10px] px-3.5 text-[15px] font-medium no-underline w-full text-left border-0 cursor-pointer";

export function Sidebar() {
  const path = usePathname();
  const projects = path === "/admin" || path.startsWith("/admin/prosjekter");
  const about = path.startsWith("/admin/om-meg");
  const cls = (on: boolean) => `${link} ${on ? "bg-sand text-forest" : "bg-transparent text-sage hover:bg-[#2a5e48] hover:text-sand"}`;
  return (
    <aside className="box-border flex max-w-full flex-[1_1_240px] flex-col gap-8 bg-forest px-[18px] py-7 text-sand">
      <div className="flex items-center gap-2.5 px-2">
        <LogoMark bg="#F3EEE3" fg="#1F4D3A" accent="#C99A22" />
        <div>
          <p className="font-serif m-0 text-xl font-semibold">Marius</p>
          <p className="m-0 font-mono text-[11px] text-[#b9c7be]">admin</p>
        </div>
      </div>
      <nav aria-label="Admin-meny" className="flex flex-col gap-1">
        <Link href="/admin" className={cls(projects)} aria-current={projects ? "page" : undefined}>
          <svg {...icon}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
          Prosjekter
        </Link>
        <Link href="/admin/om-meg" className={cls(about)} aria-current={about ? "page" : undefined}>
          <svg {...icon}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          Forside, om meg og CV
        </Link>
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-[#3c6b57] pt-4">
        <Link href="/" className={cls(false)} target="_blank">
          <svg {...icon}><path d="M7 17L17 7M8 7h9v9" /></svg>Se nettsiden
        </Link>
        <form action={logout}>
          <button type="submit" className={cls(false)}>
            <svg {...icon}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>Logg ut
          </button>
        </form>
      </div>
    </aside>
  );
}
