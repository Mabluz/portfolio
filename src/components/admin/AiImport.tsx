"use client";
import { useState } from "react";
import { buildAiPrompt, parseProjectImport, type ProjectImport } from "@/lib/project-import";

const btn = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold disabled:opacity-60";
const btnGhost = `${btn} border border-line bg-paper text-ink hover:border-ink`;
const btnPrimary = `${btn} border-0 bg-forest text-sand hover:bg-forest-dark`;

type Props = {
  techNames: string[];
  /** Fills the form. Returns an error message, or null when it worked. */
  onImport: (data: ProjectImport) => Promise<string | null>;
};

/** Copy a prompt for an AI, then paste its JSON answer back to fill in the whole project. */
export function AiImport({ techNames, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(techNames));
      setNote({ kind: "ok", text: "Prompten er kopiert. Gi den til en AI som kan se prosjektet, og lim inn svaret her." });
    } catch {
      setNote({ kind: "error", text: "Fikk ikke kopiert til utklippstavlen" });
    }
  }

  async function apply() {
    const parsed = parseProjectImport(text);
    if (!parsed.ok) { setNote({ kind: "error", text: parsed.error }); return; }
    setBusy(true);
    const error = await onImport(parsed.data);
    setBusy(false);
    if (error) { setNote({ kind: "error", text: error }); return; }
    setText("");
    setOpen(false);
    setNote({ kind: "ok", text: "Skjemaet er fylt inn. Se over og trykk Lagre." });
  }

  return (
    <section className="rounded-2xl border border-admin-line bg-paper p-6">
      <h2 className="m-0 mb-1 text-[17px] font-semibold">Fyll ut med AI</h2>
      <p className="mt-0 mb-5 text-sm text-muted-2">Kopier prompten og gi den til en AI som kan se prosjektet. Lim inn JSON-svaret for å fylle inn tekst, teknologier og lærdom på begge språk.</p>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" className={btnGhost} onClick={copyPrompt}>Kopier AI-prompt</button>
        <button type="button" className={btnGhost} aria-expanded={open} aria-controls="ai-json" onClick={() => { setOpen(!open); setNote(null); }}>Lim inn JSON</button>
      </div>
      {open && (
        <div className="mt-4 flex flex-col gap-2.5">
          <label htmlFor="ai-json" className="text-sm font-semibold">JSON fra AI-en</label>
          <textarea id="ai-json" rows={8} spellCheck={false} className="box-border w-full resize-y rounded-[10px] border border-line bg-white px-3.5 py-[11px] font-mono text-[13px] text-ink focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest" placeholder='{ "type": "BIG", ... }' value={text} onChange={(e) => setText(e.target.value)} />
          <p className="m-0 text-[13px] text-muted-2">Erstatter tekst, type, fremdrift, år, lenker, teknologier og lærdom. Bilder og status beholdes. Ingenting lagres før du trykker Lagre, men nye teknologier legges til i den delte listen med en gang.</p>
          <div><button type="button" className={btnPrimary} disabled={busy || !text.trim()} onClick={apply}>{busy ? "Fyller inn…" : "Fyll inn prosjektet"}</button></div>
        </div>
      )}
      {note && <p role={note.kind === "error" ? "alert" : "status"} className={`mt-4 mb-0 rounded-[10px] px-4 py-3 text-sm ${note.kind === "error" ? "bg-[#f6e7e4] text-[#8e2f2f]" : "bg-[#dcebe2] text-forest"}`}>{note.text}</p>}
    </section>
  );
}
