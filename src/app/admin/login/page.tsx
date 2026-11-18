import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { ArrowLeft } from "@/components/ui/Icons";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin - logg inn", robots: { index: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-sand px-5 py-12">
      <Logo />
      <main className="box-border w-full max-w-[420px] rounded-[22px] border-[1.5px] border-ink bg-paper p-9 shadow-[8px_8px_0_#2B2A24] md:px-9 md:py-10">
        <p className="m-0 mb-2 font-mono text-xs tracking-[0.1em] text-forest uppercase">Admin</p>
        <h1 className="font-serif m-0 mb-2 text-4xl font-medium">Logg inn</h1>
        <p className="m-0 mb-7 text-[15px] text-muted">Logg inn for å redigere portfolioen.</p>
        <LoginForm />
      </main>
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink no-underline">
        <ArrowLeft size={16} />Tilbake til portfolioen
      </Link>
    </div>
  );
}
