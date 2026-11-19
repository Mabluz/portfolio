/**
 * MCP server for the portfolio API (/api/v1). Lets Claude read and edit projects and the
 * "Om meg" content on the live site (or a local dev server) through the API, with an API key
 * created under "API-nøkler" in the admin.
 *
 * Config: mcp/.env (gitignored, see mcp/.env.example), or the same variables in the environment,
 * which take precedence:
 *   PORTFOLIO_API_URL  e.g. https://example.com or http://localhost:3100
 *   PORTFOLIO_API_KEY  pf_... (never commit it)
 *
 * Run: pnpm exec tsx mcp/portfolio-mcp.mts (registered in .mcp.json)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { z } from "zod";

// mcp/.env next to this file, so the key can live in the repo without being committed.
// Variables already set in the environment win.
try {
  const file = parseEnv(readFileSync(new URL(".env", import.meta.url), "utf8"));
  for (const [k, v] of Object.entries(file)) if (!process.env[k] && v) process.env[k] = v;
} catch {
  // No mcp/.env: rely on the environment
}

const BASE = (process.env.PORTFOLIO_API_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.PORTFOLIO_API_KEY ?? "";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (text: string): ToolResult => ({ content: [{ type: "text", text }], isError: true });

async function api(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<ToolResult> {
  if (!BASE || !KEY) return fail("PORTFOLIO_API_URL og PORTFOLIO_API_KEY mangler. Kopier mcp/.env.example til mcp/.env, fyll inn verdiene og start Claude Code på nytt. Nøkkelen lages under «API-nøkler» i admin.");
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return fail(`Fikk ikke kontakt med ${BASE}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) {
    const message = typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : text.slice(0, 500);
    return fail(`API-et svarte ${res.status}: ${message}`);
  }
  return ok(data);
}

const STYLE = "Skriv tekster på norsk (bokmål) i *No-feltene og engelsk i *En-feltene. Bruk aldri tankestrek (– eller —), bare vanlig bindestrek (-).";

const translation = z
  .object({
    title: z.string().max(120).optional(),
    tagline: z.string().max(300).optional().describe("Én setning, vises på kortet på forsiden. Hold den under ca. 120 tegn."),
    description: z.string().max(8000).optional().describe("Om prosjektet. Avsnitt skilles med \\n\\n."),
    why: z.string().max(3000).optional(),
    learned: z.string().max(3000).optional(),
    role: z.string().max(120).optional(),
  })
  .describe("Flettes per felt: felter du ikke sender, beholdes.");

const projectFields = {
  slug: z.string().max(80).optional().describe("Adressen /prosjekter/<slug>: a-z, tall og bindestrek."),
  type: z.enum(["BIG", "SMALL"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).optional().describe("PUBLISHED gjør prosjektet synlig på siden med en gang. Krever norsk tittel."),
  progress: z.enum(["LIVE", "IN_PROGRESS", "ABANDONED", "DISCONTINUED"]).optional().describe("Live, pågår, gitt opp eller lagt ned."),
  year: z.string().max(20).optional(),
  liveUrl: z.string().max(500).optional().describe("Full URL med https://, eller tom streng."),
  githubUrl: z.string().max(500).optional().describe("Full URL med https://, eller tom streng."),
  no: translation.optional(),
  en: translation.optional(),
  techs: z
    .array(z.object({
      name: z.string().max(60).describe("Bruk samme navn som i list_techs når teknologien finnes. Nye navn opprettes i den delte listen."),
      abbr: z.string().max(4).optional(), roleNo: z.string().max(40).optional(), roleEn: z.string().max(40).optional(),
      whyNo: z.string().max(600).optional(), whyEn: z.string().max(600).optional(),
    }))
    .max(20)
    .optional()
    .describe("Erstatter hele listen, i visningsrekkefølge. Utelatt whyNo/whyEn beholder eksisterende begrunnelse."),
  lessons: z
    .array(z.object({ headNo: z.string().max(200), bodyNo: z.string().max(2000), headEn: z.string().max(200), bodyEn: z.string().max(2000) }))
    .max(12)
    .optional()
    .describe("Utfordringer og lærdom. Erstatter hele listen."),
  images: z
    .array(z.object({ id: z.number().int(), galleryWidth: z.enum(["FULL", "HALF", "THIRD"]).optional(), captionNo: z.string().max(300).optional(), captionEn: z.string().max(300).optional() }))
    .optional()
    .describe("Bare eksisterende bilder: må inneholde alle bilde-id-ene, i ønsket rekkefølge. Første bilde er hovedbildet. Nye bilder lastes opp i admin."),
};

// A new project has no images yet, so create_project doesn't take them
const { images: _images, ...createFields } = projectFields;
void _images;

const server = new McpServer({ name: "portfolio", version: "1.0.0" });

server.registerTool("list_projects", {
  title: "List prosjekter",
  description: "Lister alle prosjekter i porteføljen, også utkast og skjulte, med id, slug, status, fremdrift og norsk tittel.",
}, async () => api("GET", "/projects"));

server.registerTool("get_project", {
  title: "Hent prosjekt",
  description: "Henter et helt prosjekt med alle felter på norsk og engelsk, teknologier, lærdom og bilder. Bruk dette før du endrer et prosjekt.",
  inputSchema: { ref: z.string().describe("Prosjektets id eller slug") },
}, async ({ ref }) => api("GET", `/projects/${encodeURIComponent(ref)}`));

server.registerTool("update_project", {
  title: "Endre prosjekt",
  description: `Endrer et prosjekt. Send bare feltene som skal endres; resten beholdes. Endringen er live med en gang. Prosjekter kan ikke slettes via API-et. ${STYLE}`,
  inputSchema: { ref: z.string().describe("Prosjektets id eller slug"), ...projectFields },
}, async ({ ref, ...changes }) => api("PATCH", `/projects/${encodeURIComponent(ref)}`, changes));

server.registerTool("create_project", {
  title: "Opprett prosjekt",
  description: `Oppretter et nytt prosjekt. Det blir et utkast med mindre status er satt. Oppgi minst no.title; adressen lages fra tittelen hvis slug mangler. Bilder lastes opp i admin etterpå. ${STYLE}`,
  inputSchema: createFields,
}, async (fields) => api("POST", "/projects", fields));

server.registerTool("get_about", {
  title: "Hent om meg",
  description: "Henter «Om meg» (ingress og tekst på norsk og engelsk), kontaktinfo, verktøy og hvilket prosjekt som vises på forsiden (heroProjectId).",
}, async () => api("GET", "/about"));

server.registerTool("update_about", {
  title: "Endre om meg",
  description: `Endrer «Om meg», kontaktinfo, verktøy eller forsideprosjektet. Send bare feltene som skal endres. Profilbilde og CV lastes opp i admin. ${STYLE}`,
  inputSchema: {
    leadNo: z.string().max(300).optional(), leadEn: z.string().max(300).optional(),
    bodyNo: z.string().max(6000).optional(), bodyEn: z.string().max(6000).optional(),
    email: z.string().max(200).optional(), githubUrl: z.string().max(500).optional(), linkedinUrl: z.string().max(500).optional(),
    tools: z.array(z.string().max(40)).max(40).optional().describe("Erstatter hele listen."),
    heroProjectId: z.number().int().nullable().optional().describe("Prosjektet som fremheves på forsiden, eller null for ingen. Vises bare hvis det er publisert."),
  },
}, async (fields) => api("PATCH", "/about", fields));

server.registerTool("list_techs", {
  title: "List teknologier",
  description: "Lister den delte teknologilisten (navn, kortkode og rolle). Bruk de samme navnene i techs når du endrer prosjekter.",
}, async () => api("GET", "/techs"));

await server.connect(new StdioServerTransport());
