"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Eye, Plus, X } from "@/components/ui/Icons";
import { slugify } from "@/lib/slug";
import { createTech, deleteProject, saveProject } from "@/server/actions/projects";
import { techAbbr, type ProjectImport } from "@/lib/project-import";
import { AiImport } from "./AiImport";
import { ImageManager, type EditorImage } from "./ImageManager";

type Lang = "no" | "en";
type Tr = { title: string; tagline: string; description: string; why: string; learned: string; role: string };
type TechRow = { techId: number; whyNo: string; whyEn: string };
type Lesson = { headNo: string; bodyNo: string; headEn: string; bodyEn: string };
export type TechOption = { id: number; name: string; abbr: string; roleNo: string; roleEn: string };

export type EditorData = {
  id: number; slug: string; type: "BIG" | "SMALL"; status: "DRAFT" | "PUBLISHED" | "HIDDEN"; progress: "LIVE" | "IN_PROGRESS" | "ABANDONED" | "DISCONTINUED";
  year: string; liveUrl: string; githubUrl: string; translations: { no: Tr; en: Tr };
  images: EditorImage[]; techs: TechRow[]; lessons: Lesson[];
};

const card = "rounded-2xl border border-admin-line bg-paper p-6";
const input = "box-border min-h-11 w-full rounded-[10px] border border-line bg-white px-3.5 py-[11px] text-[15px] text-ink focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest";
const btn = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold no-underline";
const btnGhost = `${btn} border border-line bg-paper text-ink hover:border-ink`;
const btnPrimary = `${btn} border-0 bg-forest text-sand hover:bg-forest-dark disabled:opacity-60`;

function Field({ label, id, help, children }: { label: string; id: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="mb-[18px] flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {children}
      {help && <span className="text-[13px] text-muted-2">{help}</span>}
    </div>
  );
}

export function ProjectEditor({ initial, allTechs }: { initial: EditorData; allTechs: TechOption[] }) {
  const [data, setData] = useState(initial);
  // The slug in the database; the preview must link here, not to an unsaved edit of it.
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [lang, setLang] = useState<Lang>("no");
  const [techOptions, setTechOptions] = useState(allTechs);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const slugTouched = useRef(!initial.slug.startsWith("nytt-prosjekt"));
  const [hasGithub, setHasGithub] = useState(Boolean(initial.githubUrl));
  const [newTech, setNewTech] = useState({ name: "", abbr: "", roleNo: "", roleEn: "" });
  const [techPick, setTechPick] = useState("");

  const change = (patch: Partial<EditorData>) => { setData((d) => ({ ...d, ...patch })); setDirty(true); setMessage(null); };
  const changeImages = (update: (images: EditorImage[]) => EditorImage[]) => { setData((d) => ({ ...d, images: update(d.images) })); setDirty(true); setMessage(null); };
  const setTr = (key: keyof Tr, value: string) => {
    const next = { ...data.translations, [lang]: { ...data.translations[lang], [key]: value } };
    const patch: Partial<EditorData> = { translations: next };
    if (key === "title" && lang === "no" && !slugTouched.current && value.trim()) patch.slug = slugify(value);
    change(patch);
  };

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const t = data.translations[lang];
  const missingEn = useMemo(() => (["title", "tagline", "description", "why", "learned", "role"] as const).filter((k) => !data.translations.en[k].trim()).length, [data.translations.en]);
  const whyKey = lang === "no" ? "whyNo" : "whyEn";
  const lessonKeys = lang === "no" ? (["headNo", "bodyNo"] as const) : (["headEn", "bodyEn"] as const);
  const labels = lang === "no"
    ? { title: "Tittel", titlePh: "Prosjektnavn", tagline: "Kort beskrivelse", taglinePh: "Én setning som vises på kortet", taglineHelp: "Vises på kortet på forsiden. Hold den under ca. 120 tegn.", desc: "Om prosjektet", descPh: "Hva prosjektet gjør, bakgrunnen og hvordan det fungerer", why: "Hvorfor laget du det?", whyPh: "Motivasjonen bak prosjektet", learned: "Hva lærte du?", learnedPh: "Kort oppsummering som vises på kortet", role: "Din rolle", rolePh: "F.eks. Alt selv" }
    : { title: "Title", titlePh: "Project name", tagline: "Short description", taglinePh: "One sentence shown on the card", taglineHelp: "Shown on the front page card. Keep it under about 120 characters.", desc: "About the project", descPh: "What the project does, the background and how it works", why: "Why did you build it?", whyPh: "The motivation behind the project", learned: "What did you learn?", learnedPh: "Short summary shown on the card", role: "Your role", rolePh: "E.g. Solo" };

  function save(status: EditorData["status"]) {
    const payload = {
      slug: data.slug, type: data.type, status, progress: data.progress, year: data.year,
      liveUrl: data.liveUrl, githubUrl: hasGithub ? data.githubUrl : "",
      translations: data.translations,
      images: data.images.map((i) => ({ id: i.id, galleryWidth: i.galleryWidth, captionNo: i.captionNo, captionEn: i.captionEn })),
      techs: data.techs, lessons: data.lessons,
    };
    startSave(async () => {
      const res = await saveProject(data.id, payload);
      if (res.ok) {
        setData((d) => ({ ...d, status, githubUrl: payload.githubUrl }));
        setSavedSlug(payload.slug);
        setDirty(false);
        setMessage({ kind: "ok", text: status === "PUBLISHED" && data.status !== "PUBLISHED" ? "Publisert" : "Lagret" });
      } else {
        setMessage({ kind: "error", text: res.error });
      }
    });
  }

  async function addNewTech() {
    const res = await createTech(newTech);
    if (!res.ok) { setMessage({ kind: "error", text: res.error }); return; }
    setTechOptions((o) => (o.some((x) => x.id === res.tech.id) ? o : [...o, res.tech]));
    if (!data.techs.some((x) => x.techId === res.tech.id)) change({ techs: [...data.techs, { techId: res.tech.id, whyNo: "", whyEn: "" }] });
    setNewTech({ name: "", abbr: "", roleNo: "", roleEn: "" });
  }

  /** Fills the form from the AI's JSON. Techs are matched by name; missing ones are created. */
  async function applyImport(v: ProjectImport): Promise<string | null> {
    let options = techOptions;
    const techs: TechRow[] = [];
    for (const t of v.techs) {
      let tech = options.find((o) => o.name.toLowerCase() === t.name.toLowerCase());
      if (!tech) {
        const res = await createTech({ name: t.name, abbr: t.abbr || techAbbr(t.name), roleNo: t.roleNo, roleEn: t.roleEn });
        if (!res.ok) return `${t.name}: ${res.error}`;
        tech = res.tech;
        options = [...options, tech];
      }
      if (!techs.some((r) => r.techId === tech.id)) techs.push({ techId: tech.id, whyNo: t.whyNo, whyEn: t.whyEn });
    }
    setTechOptions(options);
    const patch: Partial<EditorData> = {
      type: v.type, progress: v.progress, year: v.year, liveUrl: v.liveUrl, githubUrl: v.githubUrl,
      translations: { no: v.no, en: v.en }, techs, lessons: v.lessons,
    };
    if (!slugTouched.current && v.no.title) patch.slug = slugify(v.no.title);
    setHasGithub(Boolean(v.githubUrl));
    change(patch);
    return null;
  }

  const saveLabel = data.status === "DRAFT" ? "Lagre utkast" : "Lagre";
  const title = data.translations.no.title || "(uten tittel)";

  return (
    <div>
      <header className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-admin-line bg-admin-bg px-6 py-3.5 md:-mx-12 md:-mt-10 md:px-12">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link href="/admin" aria-label="Tilbake til prosjekter" className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-paper text-ink"><ArrowLeft /></Link>
          <div className="min-w-0">
            <p className="m-0 text-[13px] text-muted-2"><Link href="/admin" className="text-forest">Prosjekter</Link> / Rediger</p>
            <h1 className="font-serif m-0 truncate text-[26px] font-medium">{title}</h1>
          </div>
          {dirty && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e7d2] px-2.5 py-1 text-[13px] text-[#6e4a14]"><span className="h-[7px] w-[7px] rounded-full bg-[#b07a2a]" />Ulagrede endringer</span>}
          {!dirty && message?.kind === "ok" && <span role="status" className="rounded-full bg-[#dcebe2] px-2.5 py-1 text-[13px] text-forest">{message.text}</span>}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href={`/prosjekter/${savedSlug}`} target="_blank" className={btnGhost} title={dirty ? "Viser sist lagrede versjon" : undefined}><Eye size={16} />Forhåndsvis</Link>
          <button type="button" className={btnGhost} disabled={saving} onClick={() => save(data.status)}>{saving ? "Lagrer…" : saveLabel}</button>
          {data.status !== "PUBLISHED" && <button type="button" className={btnPrimary} disabled={saving} onClick={() => save("PUBLISHED")}>Publiser</button>}
        </div>
      </header>
      {message?.kind === "error" && <p role="alert" className="mb-4 rounded-[10px] bg-[#f6e7e4] px-4 py-3 text-sm text-[#8e2f2f]">{message.text}</p>}

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <section className={card}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="m-0 mb-1 text-[17px] font-semibold">Tekst</h2>
                <p className="m-0 text-sm text-muted-2">Fyll ut på begge språk. Mangler engelsk, vises norsk.</p>
              </div>
              <div role="tablist" aria-label="Språk for tekst" className="flex gap-1 rounded-[10px] bg-[#efe8da] p-1">
                <button type="button" role="tab" aria-selected={lang === "no"} onClick={() => setLang("no")} className={`min-h-10 cursor-pointer rounded-lg border-0 px-4 text-sm font-semibold ${lang === "no" ? "bg-paper text-forest shadow-[0_1px_0_#cfc6b1]" : "bg-transparent text-muted"}`}>Norsk</button>
                <button type="button" role="tab" aria-selected={lang === "en"} onClick={() => setLang("en")} className={`min-h-10 cursor-pointer rounded-lg border-0 px-4 text-sm font-semibold ${lang === "en" ? "bg-paper text-forest shadow-[0_1px_0_#cfc6b1]" : "bg-transparent text-muted"}`}>
                  English{missingEn > 0 && <span className="ml-1.5 rounded bg-[#f3e7d2] px-1.5 py-0.5 font-mono text-[11px] text-[#6e4a14]">{missingEn} mangler</span>}
                </button>
              </div>
            </div>
            <Field label={labels.title} id="f-title"><input id="f-title" className={input} value={t.title} placeholder={labels.titlePh} onChange={(e) => setTr("title", e.target.value)} /></Field>
            <Field label={labels.tagline} id="f-tag" help={labels.taglineHelp}><input id="f-tag" className={input} value={t.tagline} placeholder={labels.taglinePh} onChange={(e) => setTr("tagline", e.target.value)} /></Field>
            <Field label={labels.role} id="f-role"><input id="f-role" className={input} value={t.role} placeholder={labels.rolePh} onChange={(e) => setTr("role", e.target.value)} /></Field>
            <Field label={labels.desc} id="f-desc"><textarea id="f-desc" rows={6} className={`${input} resize-y leading-[1.55]`} value={t.description} placeholder={labels.descPh} onChange={(e) => setTr("description", e.target.value)} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={labels.why} id="f-why"><textarea id="f-why" rows={3} className={`${input} resize-y leading-[1.55]`} value={t.why} placeholder={labels.whyPh} onChange={(e) => setTr("why", e.target.value)} /></Field>
              <Field label={labels.learned} id="f-learn"><textarea id="f-learn" rows={3} className={`${input} resize-y leading-[1.55]`} value={t.learned} placeholder={labels.learnedPh} onChange={(e) => setTr("learned", e.target.value)} /></Field>
            </div>
          </section>

          <section className={card}>
            <h2 className="m-0 mb-1 text-[17px] font-semibold">Bilder</h2>
            <p className="mt-0 mb-5 text-sm text-muted-2">Dra for å endre rekkefølge. Det første bildet er hovedbildet og vises alltid i full bredde øverst. For de andre velger du hvor bredt de vises i galleriet. Opplasting og fjerning skjer med en gang; rekkefølge, bredde og bildetekst lagres med «{saveLabel}».</p>
            <ImageManager projectId={data.id} images={data.images} lang={lang} onChange={changeImages} />
          </section>

          <section className={card}>
            <h2 className="m-0 mb-1 text-[17px] font-semibold">Teknologier</h2>
            <p className="mt-0 mb-5 text-sm text-muted-2">Vises som tagger på kortene, og med begrunnelse på prosjektsiden. Teknologiene er delt mellom alle prosjekter.</p>
            <div className="mb-4 flex flex-col gap-2.5">
              {data.techs.map((row, i) => {
                const tech = techOptions.find((x) => x.id === row.techId);
                if (!tech) return null;
                return (
                  <div key={row.techId} className="grid items-center gap-2.5 md:grid-cols-[minmax(140px,200px)_minmax(0,1fr)_44px]">
                    <span className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#efe8da] px-3.5 text-sm font-semibold"><span className="font-mono text-[11px] text-forest">{lang === "no" ? tech.roleNo : tech.roleEn}</span>{tech.name}</span>
                    <input aria-label={`Hvorfor ${tech.name}`} className={input} value={row[whyKey]} placeholder={`Hvorfor valgte du ${tech.name}?`} onChange={(e) => change({ techs: data.techs.map((r, k) => (k === i ? { ...r, [whyKey]: e.target.value } : r)) })} />
                    <button type="button" aria-label={`Fjern ${tech.name}`} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-tag" onClick={() => change({ techs: data.techs.filter((_, k) => k !== i) })}><X size={16} /></button>
                  </div>
                );
              })}
            </div>
            <div className="mb-4 flex flex-wrap gap-2.5">
              <label htmlFor="f-techpick" className="sr-only">Legg til teknologi</label>
              <select id="f-techpick" className={`${input} flex-[1_1_240px] !w-auto`} value={techPick} onChange={(e) => setTechPick(e.target.value)}>
                <option value="">Velg teknologi…</option>
                {techOptions.filter((o) => !data.techs.some((r) => r.techId === o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button type="button" className={btnGhost} disabled={!techPick} onClick={() => { change({ techs: [...data.techs, { techId: Number(techPick), whyNo: "", whyEn: "" }] }); setTechPick(""); }}><Plus size={16} />Legg til</button>
            </div>
            <fieldset className="m-0 rounded-xl border border-admin-line p-4">
              <legend className="px-1.5 text-sm font-semibold">Ny teknologi</legend>
              <div className="grid gap-2.5 md:grid-cols-[1.5fr_0.6fr_1fr_1fr_auto]">
                <input aria-label="Navn" className={input} placeholder="Navn, f.eks. Next.js" value={newTech.name} onChange={(e) => setNewTech({ ...newTech, name: e.target.value })} />
                <input aria-label="Kortkode" className={input} placeholder="Kode" maxLength={4} value={newTech.abbr} onChange={(e) => setNewTech({ ...newTech, abbr: e.target.value })} />
                <input aria-label="Rolle (norsk)" className={input} placeholder="Rolle (NO)" value={newTech.roleNo} onChange={(e) => setNewTech({ ...newTech, roleNo: e.target.value })} />
                <input aria-label="Rolle (engelsk)" className={input} placeholder="Role (EN)" value={newTech.roleEn} onChange={(e) => setNewTech({ ...newTech, roleEn: e.target.value })} />
                <button type="button" className={btnGhost} disabled={!newTech.name.trim() || !newTech.abbr.trim()} onClick={addNewTech}>Opprett</button>
              </div>
            </fieldset>
          </section>

          <section className={card}>
            <h2 className="m-0 mb-1 text-[17px] font-semibold">Utfordringer og lærdom</h2>
            <p className="mt-0 mb-5 text-sm text-muted-2">Vises som nummererte punkter på prosjektsiden. Er listen tom, vises «Hva lærte du?» som ett avsnitt.</p>
            <div className="mb-4 flex flex-col gap-4">
              {data.lessons.map((l, i) => (
                <div key={i} className="rounded-xl border border-admin-line p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[13px] text-forest">{String(i + 1).padStart(2, "0")}</span>
                    <button type="button" aria-label={`Fjern punkt ${i + 1}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-tag" onClick={() => change({ lessons: data.lessons.filter((_, k) => k !== i) })}><X size={16} /></button>
                  </div>
                  <input aria-label={`Overskrift ${i + 1}`} className={`${input} mb-2`} placeholder="Utfordring eller lærdom" value={l[lessonKeys[0]]} onChange={(e) => change({ lessons: data.lessons.map((x, k) => (k === i ? { ...x, [lessonKeys[0]]: e.target.value } : x)) })} />
                  <textarea aria-label={`Tekst ${i + 1}`} rows={3} className={`${input} resize-y leading-[1.55]`} placeholder="Hva som var vanskelig, og hva du lærte av det" value={l[lessonKeys[1]]} onChange={(e) => change({ lessons: data.lessons.map((x, k) => (k === i ? { ...x, [lessonKeys[1]]: e.target.value } : x)) })} />
                </div>
              ))}
            </div>
            <button type="button" className={btnGhost} onClick={() => change({ lessons: [...data.lessons, { headNo: "", bodyNo: "", headEn: "", bodyEn: "" }] })}><Plus size={16} />Legg til punkt</button>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          <AiImport
            techNames={techOptions.map((o) => o.name)}
            imageInput={() => ({
              type: data.type, progress: data.progress, no: data.translations.no, en: data.translations.en, liveUrl: data.liveUrl,
              techs: data.techs.flatMap((r) => techOptions.find((o) => o.id === r.techId)?.name ?? []),
            })}
            onImport={applyImport}
          />
          <section className={card}>
            <h2 className="m-0 mb-1 text-[17px] font-semibold">Publisering</h2>
            <p className="mt-0 mb-5 text-sm text-muted-2">Hvor prosjektet vises på siden.</p>
            <div className="mb-[18px] flex flex-col gap-1.5">
              <span id="type-lbl" className="text-sm font-semibold">Type</span>
              <div role="radiogroup" aria-labelledby="type-lbl" className="flex">
                {([["BIG", "Stort prosjekt"], ["SMALL", "Lite prosjekt"]] as const).map(([v, label]) => (
                  <button key={v} type="button" role="radio" aria-checked={data.type === v} onClick={() => change({ type: v })} className={`min-h-11 flex-1 cursor-pointer border text-sm font-semibold first:rounded-l-[10px] last:rounded-r-[10px] [&+&]:border-l-0 ${data.type === v ? "border-forest bg-forest text-sand" : "border-line bg-white text-ink"}`}>{label}</button>
                ))}
              </div>
            </div>
            <Field label="Status" id="f-status">
              <select id="f-status" className={input} value={data.status} onChange={(e) => change({ status: e.target.value as EditorData["status"] })}>
                <option value="DRAFT">Utkast</option><option value="PUBLISHED">Publisert</option><option value="HIDDEN">Skjult</option>
              </select>
            </Field>
            <Field label="Fremdrift" id="f-progress">
              <select id="f-progress" className={input} value={data.progress} onChange={(e) => change({ progress: e.target.value as EditorData["progress"] })}>
                <option value="IN_PROGRESS">Pågår</option><option value="LIVE">Live</option><option value="ABANDONED">Gitt opp</option><option value="DISCONTINUED">Lagt ned</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="År" id="f-year"><input id="f-year" className={input} inputMode="numeric" placeholder="2026" value={data.year} onChange={(e) => change({ year: e.target.value })} /></Field>
              <Field label="Adresse" id="f-slug"><input id="f-slug" className={`${input} font-mono !text-[13px]`} placeholder="prosjekt-1" value={data.slug} onChange={(e) => { slugTouched.current = true; change({ slug: e.target.value }); }} /></Field>
            </div>
          </section>

          <section className={card}>
            <h2 className="m-0 mb-1 text-[17px] font-semibold">Lenker</h2>
            <p className="mt-0 mb-5 text-sm text-muted-2">Styrer knappene på kortet og prosjektsiden.</p>
            <Field label="Live-side (Se prosjektet)" id="f-live"><input id="f-live" type="url" className={input} placeholder="https://" value={data.liveUrl} onChange={(e) => change({ liveUrl: e.target.value })} /></Field>
            <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
              <span id="gh-lbl" className="text-sm font-semibold">Prosjektet ligger på GitHub</span>
              <button type="button" role="switch" aria-checked={hasGithub} aria-labelledby="gh-lbl" onClick={() => { setHasGithub(!hasGithub); setDirty(true); }} className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border-0 ${hasGithub ? "bg-forest" : "bg-line"}`}>
                <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-paper transition-[left] ${hasGithub ? "left-[23px]" : "left-[3px]"}`} />
              </button>
            </div>
            {hasGithub ? (
              <Field label="GitHub-lenke" id="f-gh"><input id="f-gh" type="url" className={input} placeholder="https://github.com/..." value={data.githubUrl} onChange={(e) => change({ githubUrl: e.target.value })} /></Field>
            ) : <p className="m-0 text-[13px] text-muted-2">GitHub-knappen skjules på siden.</p>}
          </section>

          <section className={`${card} !border-[#e5c9c4]`}>
            <h2 className="m-0 mb-1 text-[17px] font-semibold">Faresone</h2>
            <p className="mt-0 mb-5 text-sm text-muted-2">Sletting kan ikke angres. Bildene slettes også.</p>
            {!confirmDelete ? (
              <button type="button" className={`${btn} border border-[#c9a0a0] bg-transparent text-[#8e2f2f] hover:bg-[#f6e7e4]`} onClick={() => setConfirmDelete(true)}>Slett prosjekt</button>
            ) : (
              <div role="alertdialog" aria-label="Bekreft sletting" className="rounded-xl bg-[#f6e7e4] p-4">
                <p className="mt-0 mb-3 text-sm font-semibold text-[#8e2f2f]">Slette «{title}» for godt?</p>
                <div className="flex gap-2.5">
                  <button type="button" disabled={deleting} className={`${btn} border-0 bg-[#8e2f2f] text-white disabled:opacity-60`} onClick={() => startDelete(async () => { setDirty(false); await deleteProject(data.id); })}>{deleting ? "Sletter…" : "Ja, slett"}</button>
                  <button type="button" className={btnGhost} onClick={() => setConfirmDelete(false)}>Avbryt</button>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
