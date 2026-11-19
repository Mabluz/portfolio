# Portfolio (Marius)

Personlig portfolio med offentlig side og admin. Next.js 16 (App Router), React 19, TypeScript, Prisma 7 + PostgreSQL, Tailwind 4, pnpm. Selvhostet i Docker.

@AGENTS.md

Next 16 avviker fra eldre versjoner (f.eks. `src/proxy.ts` erstatter middleware). Les `node_modules/next/dist/docs/` før du bruker Next-API du ikke er sikker på.

## Design

Kilden er Claude-design-canvaset: https://claude.ai/artifact/5bS66QXmzRYyFNoGMZ9vvB (artboards: Main, Prosjekt, Admin, AdminRediger, Login, Farger, Fonter, MainMobil, ProsjektMobil). Mobilskissene er de samme sidene ved 390 px, ikke egne tegninger. Hent filer med Artifact-verktøyet (`list` med `scope: "files"`, deretter `read` med `paths`). Brytepunkt er 900 px (`md:` er satt til 900px).

Tokens ligger i `@theme` i `src/app/globals.css` (sand, forest, gold, ink, sage osv.). Fonter: DM Serif Display (`font-serif`, brukes til alle overskrifter, kun vekt 400 og kursiv), Inter (brødtekst), JetBrains Mono (labels). Bruk ikke tankestrek ("–") i tekst, bare vanlig bindestrek ("-").

## Kommandoer

```
pnpm db:up          # Postgres 16 i Docker på localhost:5433
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # placeholder-prosjekter, kun i tom database
pnpm admin:create   # opprett eller nullstill admin (min. 12 tegn passord)
pnpm dev            # http://localhost:3100
pnpm typecheck && pnpm lint && pnpm test
```

`.env` er lokal og gitignored (se `.env.example`). Prisma-klienten genereres til `src/generated/prisma` (gitignored) av `postinstall`.

## Arkitektur

- `src/app/(public)`: forside og `/prosjekter/[slug]`. Alle prosjekter, også små, har en detaljside. Tomme seksjoner skjules.
- `src/app/admin`: `login` og `(protected)` (oversikt med dra-og-slipp-rekkefølge og valg av forsideprosjekt, prosjekteditor, "Om meg" og CV). Admin er kun norsk. `proxy.ts` er bare en optimistisk redirect; ekte sjekk er `requireAdmin()`, som **må** kalles i hver admin-action og layout.
- `src/server/actions/`: Server Actions (`projects`, `about`, `auth`, `lang`). All mutasjon går her.
- `src/lib/`: `db` (Prisma + pg-adapter), `auth` (økter, throttle), `i18n` (`dict`, `getLang`, `pick`), `queries`, `uploads`, `validation` (zod), `slug`.
- `uploads/[...path]` og `cv` er route handlers som leverer filer fra `UPLOAD_DIR` (standalone-build kan ikke servere runtime-filer fra `public/`). `api/health` brukes av Docker HEALTHCHECK.

### Konvensjoner

- **Språk**: NO/EN styres av `lang`-cookie, ingen URL-endring. Norsk er standard. `pick(lang, no, en)` faller tilbake til norsk når engelsk er tom. Tekster i UI ligger i `dict` i `src/lib/i18n.ts`; prosjekttekster i `ProjectTranslation` (locale `no`/`en`).
- **Auth**: bcryptjs, tilfeldig 32-byte token lagret som sha256 i DB, httpOnly-cookie `session`, 30 dager. Innlogging er begrenset til 5 forsøk per 15 min per IP (i minnet). Ingen "glemt passord"; admin opprettes og nullstilles via CLI på serveren.
- **Opplastinger**: bilder konverteres med sharp til WebP (maks 2400 px, 15 MB inn), PDF sjekkes på `%PDF-` (maks 10 MB). Lagres på disk under `UPLOAD_DIR` (Docker-volum). Path traversal er blokkert i `resolveUploadPath`.
- **Server Actions**: body-grense er satt til 20 MB i `next.config.ts`. Origin sjekkes mot forwarded host, så reverse proxy må sende `X-Forwarded-Host`. Innloggingsgrensen bruker `X-Real-IP` (nginx: `$remote_addr`), ellers siste verdi i `X-Forwarded-For`; aldri den første, den styres av klienten.
- Dynamiske sider: `cacheComponents` og `partialPrefetching` er bevisst skrudd av.
- **Datamodell** (`prisma/schema.prisma`): Project (BIG/SMALL, DRAFT/PUBLISHED/HIDDEN, fremdrift LIVE/IN_PROGRESS/ABANDONED/DISCONTINUED), ProjectTranslation, ProjectImage (første bilde er hovedbilde og alltid full bredde), Tech + ProjectTech (delt liste med begrunnelse per prosjekt), Lesson, SiteSettings (singleton id=1), AdminUser, Session.
- **Forsideprosjekt**: `SiteSettings.currentProjectId`, valgt med radioknapper på admin-oversikten (`setHeroProject`). Vises bare hvis publisert, og skjules da fra listene under. Kortets tekster følger fremdriften (`heroTexts` i `i18n.ts`), og beskrivelsen er prosjektets tagline. `nowTextNo`/`nowTextEn` er utgått og ubrukt; fjern kolonnene i en senere deploy.
- **Fyll ut med AI**: kortet i prosjekteditoren kopierer en prompt (`buildAiPrompt` i `src/lib/project-import.ts`) og leser JSON-svaret tilbake (`parseProjectImport`). Importen fyller bare skjemaet; ingenting lagres før «Lagre», men ukjente teknologier opprettes med en gang (matches på navn). Endres skjemaet for prosjekter, må formatet og prompten følge med. «Kopier bildeprompt» (`buildImagePrompt` i `src/lib/image-prompt.ts`) lager en engelsk prompt for bilde-AI fra skjemaets tekst: først et designet forsidebilde (16:10, mørkt omslag med tittel, teknologibrikker og elementer som viser hva appen gjør), så skjermbilder i formatene siden bruker (21:9, 16:10 og 4:3 i galleriet).
- Skrive migrasjoner med `pnpm db:migrate`; produksjon kjører `prisma migrate deploy` ved oppstart (se `docker-entrypoint.sh`). Migrasjoner må være bakoverkompatible med forrige versjon (expand/contract), fordi automatisk tilbakerulling i `deploy.sh` ikke reverserer dem. Gi nytt navn til eller fjern kolonner over to deployer.

## Deploy

Speiler `../zellstrikka`: GitHub Actions (`ci.yml`, `deploy.yml`) kopierer byggekonteksten med scp til serveren, og `scripts/deploy.sh` bygger imaget, sjekker `/api/health`, ruller tilbake automatisk ved feil og beholder 5 image-tagger. Secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `PORTFOLIO_PATH`.

`docker-compose.yml` og `.env` ligger kun på serveren (repoet har `docker-compose.prod.example.yml` og `.env.example`). Produksjon bruker delt Postgres via `DATABASE_URL`, og containeren lytter på 127.0.0.1:3100. Nginx konfigureres av eieren selv. Admin opprettes på serveren med `docker compose exec portfolio node scripts/admin-create.mjs`.

## Status og kjente hull

- Verifisert: typecheck, lint, 79 tester, produksjonsbygg, Docker-image, innlogging, prosjektredigering og bildeopplasting.
- Ikke testet manuelt: dra-og-slipp-rekkefølge, opprette og slette prosjekt, "Om meg"-siden, CV-opplasting, mobilvisning i admin, GitHub Actions-workflowene.
- Lokal dev-admin finnes i dev-databasen. Innloggingen står i `CLAUDE.local.md` (gitignored); opprett eller nullstill med `pnpm admin:create`.

## Arbeidsmåte

Eieren ønsker at du spør i stedet for å gjette ved uklarheter om prosjektet. Svar på norsk.
