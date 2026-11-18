import { z } from "zod";

/**
 * "Fill in with AI": a prompt the admin copies to an AI, and the JSON format the AI answers with,
 * which the project editor reads back in. Shared by client and tests, so no server imports here.
 */

const str = (max: number) => z.string().trim().max(max).default("");

const translation = z
  .object({ title: str(120), tagline: str(300), description: str(8000), why: str(3000), learned: str(3000), role: str(120) })
  .default({ title: "", tagline: "", description: "", why: "", learned: "", role: "" });

const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "må starte med http:// eller https://")
  .default("");

export const projectImportSchema = z.object({
  type: z.enum(["BIG", "SMALL"]).default("BIG"),
  progress: z.enum(["LIVE", "IN_PROGRESS", "ABANDONED", "DISCONTINUED"]).default("IN_PROGRESS"),
  year: str(20),
  liveUrl: url,
  githubUrl: url,
  no: translation,
  en: translation,
  techs: z
    .array(z.object({ name: z.string().trim().min(1, "mangler navn").max(60), abbr: str(4), roleNo: str(40), roleEn: str(40), whyNo: str(600), whyEn: str(600) }))
    .max(20)
    .default([]),
  lessons: z.array(z.object({ headNo: str(200), bodyNo: str(2000), headEn: str(200), bodyEn: str(2000) })).max(12).default([]),
});

export type ProjectImport = z.infer<typeof projectImportSchema>;

/** Reads the AI's answer. Accepts a bare object or one wrapped in a ```json block with text around it. */
export function parseProjectImport(text: string): { ok: true; data: ProjectImport } | { ok: false; error: string } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  let source = (fenced ?? text).trim();
  if (!fenced) {
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start !== -1 && end > start) source = source.slice(start, end + 1);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return { ok: false, error: "Teksten er ikke gyldig JSON" };
  }
  const parsed = projectImportSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return { ok: false, error: `Feil i JSON${path ? ` (${path})` : ""}: ${issue?.message ?? "ugyldige data"}` };
  }
  return { ok: true, data: parsed.data };
}

/** Default abbreviation for a new tech when the AI left it out, e.g. "Next.js" -> "NE". */
export function techAbbr(name: string): string {
  const letters = name.replace(/[^\p{L}\p{N}]/gu, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}

const EXAMPLE = {
  type: "BIG",
  progress: "LIVE",
  year: "2026",
  liveUrl: "https://example.com",
  githubUrl: "https://github.com/bruker/repo",
  no: { title: "", tagline: "", description: "", why: "", learned: "", role: "" },
  en: { title: "", tagline: "", description: "", why: "", learned: "", role: "" },
  techs: [{ name: "Next.js", abbr: "NX", roleNo: "Rammeverk", roleEn: "Framework", whyNo: "", whyEn: "" }],
  lessons: [{ headNo: "", bodyNo: "", headEn: "", bodyEn: "" }],
};

/** The prompt to give an AI that can see the project (e.g. a coding agent in the repo). */
export function buildAiPrompt(existingTechs: string[]): string {
  const techs = existingTechs.length > 0 ? existingTechs.join(", ") : "(ingen ennå)";
  return `Du skal dokumentere et programmeringsprosjekt for porteføljen min. Se gjennom prosjektet (kode, README, git-historikk og det du ellers har tilgang til) og svar med ÉN JSON-fil og ingenting annet. Lagre den gjerne som portfolio-prosjekt.json, og vis innholdet i en \`\`\`json-blokk.

Formatet er nøyaktig dette (alle felter skal være med, bruk "" når du ikke vet):

${JSON.stringify(EXAMPLE, null, 2)}

Felter:
- type: "BIG" for større prosjekter jeg har brukt mye tid på, "SMALL" for små verktøy og eksperimenter.
- progress: "LIVE" (ute og i bruk), "IN_PROGRESS" (pågår), "ABANDONED" (gitt opp) eller "DISCONTINUED" (lagt ned).
- year: årstall, f.eks. "2026" eller "2024-2026".
- liveUrl / githubUrl: fulle lenker med https://, eller "" hvis de ikke finnes.
- no og en: samme innhold på norsk (bokmål) og engelsk.
  - title: prosjektnavnet (maks 120 tegn).
  - tagline: én setning om hva prosjektet er, vises på kortet på forsiden (under ca. 120 tegn).
  - description: hva prosjektet gjør, bakgrunnen og hvordan det fungerer. 2-4 avsnitt, skill avsnitt med \\n\\n (maks 8000 tegn).
  - why: hvorfor jeg laget det, 1-3 setninger (maks 3000 tegn).
  - learned: kort oppsummering av hva jeg lærte, 1-3 setninger (maks 3000 tegn).
  - role: min rolle, kort, f.eks. "Alt selv" / "Solo" eller "Frontend" (maks 120 tegn).
- techs: de viktigste teknologiene, maks 20, viktigst først.
  - name: bruk nøyaktig samme navn hvis teknologien finnes i listen min: ${techs}
  - abbr: kortkode på maks 4 tegn. roleNo/roleEn: hva den brukes til, maks 40 tegn (f.eks. "Database" / "Database").
  - whyNo/whyEn: hvorfor akkurat denne ble valgt i prosjektet, 1-2 setninger (maks 600 tegn).
- lessons: 2-5 konkrete utfordringer og hva jeg lærte av dem (maks 12). headNo/headEn er en kort overskrift, bodyNo/bodyEn 2-4 setninger.

Skriveregler:
- Skriv i første person, som meg, uformelt men presist. Ikke selg inn, ikke bruk superlativer.
- Ikke bruk tankestrek (\u2013) eller lang tankestrek (\u2014), bare vanlig bindestrek (-).
- Ikke finn på ting. Er du usikker på et felt, la det være "".
- Svar bare med gyldig JSON (doble anførselstegn, ingen kommentarer, ingen etterfølgende komma).`;
}
