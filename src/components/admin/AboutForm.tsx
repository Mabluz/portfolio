"use client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Plus, X } from "@/components/ui/Icons";
import { removeCv, saveAbout, uploadCv, uploadPhoto } from "@/server/actions/about";

export type AboutData = {
  currentProjectId: number | null; nowTextNo: string; nowTextEn: string;
  aboutLeadNo: string; aboutLeadEn: string; aboutBodyNo: string; aboutBodyEn: string;
  email: string; githubUrl: string; linkedinUrl: string; tools: string[];
  photoPath: string | null; cvPath: string | null; cvUpdated: string | null;
};
export type ProjectOption = { id: number; title: string; published: boolean };

const card = "rounded-2xl border border-admin-line bg-paper p-6";
const input = "box-border min-h-11 w-full rounded-[10px] border border-line bg-white px-3.5 py-[11px] text-[15px] text-ink focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest";
const btn = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold no-underline";
const btnGhost = `${btn} border border-line bg-paper text-ink hover:border-ink disabled:opacity-60`;

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="mb-[18px] flex flex-col gap-1.5"><label htmlFor={id} className="text-sm font-semibold">{label}</label>{children}</div>;
}

export function AboutForm({ initial, projects }: { initial: AboutData; projects: ProjectOption[] }) {
  const [d, setD] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [toolDraft, setToolDraft] = useState("");
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const set = (patch: Partial<AboutData>) => { setD((x) => ({ ...x, ...patch })); setDirty(true); setMsg(null); };

  function save() {
    startSave(async () => {
      const res = await saveAbout({
        currentProjectId: d.currentProjectId, nowTextNo: d.nowTextNo, nowTextEn: d.nowTextEn,
        aboutLeadNo: d.aboutLeadNo, aboutLeadEn: d.aboutLeadEn, aboutBodyNo: d.aboutBodyNo, aboutBodyEn: d.aboutBodyEn,
        email: d.email, githubUrl: d.githubUrl, linkedinUrl: d.linkedinUrl, tools: d.tools,
      });
      if (res.ok) { setDirty(false); setMsg({ kind: "ok", text: "Lagret" }); } else setMsg({ kind: "error", text: res.error });
    });
  }

  const addTool = () => {
    const v = toolDraft.trim();
    if (v && !d.tools.includes(v)) set({ tools: [...d.tools, v] });
    setToolDraft("");
  };

  function onPhoto(file?: File) {
    if (!file) return;
    const fd = new FormData(); fd.set("file", file);
    startUpload(async () => {
      const res = await uploadPhoto(fd);
      if (res.ok) { setD((x) => ({ ...x, photoPath: res.path })); setMsg({ kind: "ok", text: "Bildet er lastet opp" }); } else setMsg({ kind: "error", text: res.error });
    });
  }
  function onCv(file?: File) {
    if (!file) return;
    const fd = new FormData(); fd.set("file", file);
    startUpload(async () => {
      const res = await uploadCv(fd);
      if (res.ok) { setD((x) => ({ ...x, cvPath: "set", cvUpdated: res.updatedAt })); setMsg({ kind: "ok", text: "CV-en er lastet opp" }); } else setMsg({ kind: "error", text: res.error });
    });
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 mb-1.5 font-mono text-[13px] text-forest">Forside, om meg og CV</p>
          <h1 className="font-serif m-0 text-[40px] font-medium">Om meg</h1>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="rounded-full bg-[#f3e7d2] px-2.5 py-1 text-[13px] text-[#6e4a14]">Ulagrede endringer</span>}
          {!dirty && msg?.kind === "ok" && <span role="status" className="rounded-full bg-[#dcebe2] px-2.5 py-1 text-[13px] text-forest">{msg.text}</span>}
          <button type="button" disabled={saving} onClick={save} className={`${btn} border-0 bg-forest text-sand hover:bg-forest-dark disabled:opacity-60`}>{saving ? "Lagrer…" : "Lagre"}</button>
        </div>
      </div>
      {msg?.kind === "error" && <p role="alert" className="mb-4 rounded-[10px] bg-[#f6e7e4] px-4 py-3 text-sm text-[#8e2f2f]">{msg.text}</p>}

      <div className="flex flex-col gap-6">
        <section className={card}>
          <h2 className="m-0 mb-1 text-[17px] font-semibold">«Akkurat nå bygger jeg»</h2>
          <p className="mt-0 mb-5 text-sm text-muted-2">Kortet øverst til høyre på forsiden. Velg ingen for å skjule det.</p>
          <Field label="Prosjekt" id="f-current">
            <select id="f-current" className={input} value={d.currentProjectId ?? ""} onChange={(e) => set({ currentProjectId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Ingen (skjul kortet)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}{p.published ? "" : " (ikke publisert)"}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Én linje (norsk)" id="f-now-no"><input id="f-now-no" className={input} value={d.nowTextNo} onChange={(e) => set({ nowTextNo: e.target.value })} /></Field>
            <Field label="One line (English)" id="f-now-en"><input id="f-now-en" className={input} value={d.nowTextEn} onChange={(e) => set({ nowTextEn: e.target.value })} /></Field>
          </div>
        </section>

        <section className={card}>
          <h2 className="m-0 mb-5 text-[17px] font-semibold">Om meg</h2>
          <div className="mb-[18px] flex items-center gap-5">
            <div className="h-[100px] w-20 shrink-0 overflow-hidden rounded-t-[40px] rounded-b-lg border border-line bg-[#dcd2bc]">
              {d.photoPath && <Image src={`/uploads/${d.photoPath}`} alt="Nåværende bilde" width={160} height={200} unoptimized className="h-full w-full object-cover" />}
            </div>
            <div>
              <label htmlFor="f-photo" className={`${btnGhost} ${uploading ? "opacity-60" : ""}`}>{d.photoPath ? "Bytt bilde" : "Last opp bilde"}</label>
              <input id="f-photo" type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => onPhoto(e.target.files?.[0])} />
              <p className="mt-2 mb-0 text-[13px] text-muted-2">Vises som arch-bilde, 4:5. Lagres med en gang.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Innledning (norsk)" id="f-lead-no"><textarea id="f-lead-no" rows={2} className={`${input} resize-y`} value={d.aboutLeadNo} onChange={(e) => set({ aboutLeadNo: e.target.value })} /></Field>
            <Field label="Lead (English)" id="f-lead-en"><textarea id="f-lead-en" rows={2} className={`${input} resize-y`} value={d.aboutLeadEn} onChange={(e) => set({ aboutLeadEn: e.target.value })} /></Field>
            <Field label="Tekst (norsk)" id="f-body-no"><textarea id="f-body-no" rows={7} className={`${input} resize-y leading-[1.55]`} value={d.aboutBodyNo} onChange={(e) => set({ aboutBodyNo: e.target.value })} /></Field>
            <Field label="Text (English)" id="f-body-en"><textarea id="f-body-en" rows={7} className={`${input} resize-y leading-[1.55]`} value={d.aboutBodyEn} onChange={(e) => set({ aboutBodyEn: e.target.value })} /></Field>
          </div>
        </section>

        <section className={card}>
          <h2 className="m-0 mb-5 text-[17px] font-semibold">Verktøy</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {d.tools.map((tool) => (
              <span key={tool} className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-1 pr-1 pl-3.5 text-sm">
                {tool}
                <button type="button" aria-label={`Fjern ${tool}`} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-tag" onClick={() => set({ tools: d.tools.filter((x) => x !== tool) })}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <label htmlFor="f-tool" className="sr-only">Nytt verktøy</label>
            <input id="f-tool" className={`${input} flex-[1_1_240px] !w-auto`} placeholder="Legg til verktøy" value={toolDraft} onChange={(e) => setToolDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTool(); } }} />
            <button type="button" className={btnGhost} onClick={addTool}><Plus size={16} />Legg til</button>
          </div>
        </section>

        <section className={card}>
          <h2 className="m-0 mb-5 text-[17px] font-semibold">Kontakt</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="E-post" id="f-email"><input id="f-email" type="email" className={input} value={d.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="GitHub" id="f-gh"><input id="f-gh" type="url" className={input} placeholder="https://github.com/..." value={d.githubUrl} onChange={(e) => set({ githubUrl: e.target.value })} /></Field>
            <Field label="LinkedIn" id="f-li"><input id="f-li" type="url" className={input} placeholder="https://linkedin.com/in/..." value={d.linkedinUrl} onChange={(e) => set({ linkedinUrl: e.target.value })} /></Field>
          </div>
        </section>

        <section id="cv" className={card}>
          <h2 className="m-0 mb-1 text-[17px] font-semibold">CV</h2>
          <p className="mt-0 mb-5 text-sm text-muted-2">PDF, maks 10 MB. «Last ned CV»-knappen vises på forsiden så lenge en CV er lastet opp. Lagres med en gang.</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-forest font-mono text-sm text-sand">PDF</div>
            <p className="m-0 mr-auto font-mono text-[13px] text-muted-2">
              {d.cvPath ? <>Lastet opp {d.cvUpdated ? new Date(d.cvUpdated).toLocaleDateString("nb-NO") : ""} · <a href="/cv" className="text-forest">Last ned</a></> : "Ikke lastet opp"}
            </p>
            <label htmlFor="f-cv" className={btnGhost}>{d.cvPath ? "Last opp ny" : "Last opp CV"}</label>
            <input id="f-cv" type="file" accept="application/pdf" className="sr-only" disabled={uploading} onChange={(e) => onCv(e.target.files?.[0])} />
            {d.cvPath && <button type="button" className={btnGhost} onClick={() => startUpload(async () => { const r = await removeCv(); if (r.ok) setD((x) => ({ ...x, cvPath: null, cvUpdated: null })); else setMsg({ kind: "error", text: r.error }); })}>Fjern</button>}
          </div>
        </section>
      </div>
    </div>
  );
}
