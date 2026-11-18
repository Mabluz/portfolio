"use client";
import { useTransition } from "react";
import { setLang } from "@/server/actions/lang";

export function LangToggle({ lang, label }: { lang: "no" | "en"; label: string }) {
  const [pending, start] = useTransition();
  const btn = (code: "no" | "en") => (
    <button
      key={code}
      type="button"
      aria-pressed={lang === code}
      disabled={pending}
      onClick={() => start(() => setLang(code))}
      className={`min-h-11 min-w-11 cursor-pointer rounded-full border-0 px-3 py-2.5 font-mono text-[13px] font-medium ${lang === code ? "bg-forest text-sand" : "bg-transparent text-muted"}`}
    >
      {code.toUpperCase()}
    </button>
  );
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-full border-[1.5px] border-ink p-[3px]">
      {btn("no")}
      {btn("en")}
    </div>
  );
}
