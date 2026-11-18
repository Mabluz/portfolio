# Portfolio

Personal portfolio for Marius: a public site (Norwegian/English) and a small admin for managing projects.

**Stack:** TypeScript · React 19 · Next.js 16 (App Router, standalone output) · PostgreSQL · Prisma 7 · Tailwind CSS 4 · pnpm

## What's in it

- **Public site** - front page (hero, "currently building" card, big projects, small projects, about/CV/contact) and a page per project at `/prosjekter/<slug>`. NO/EN toggle stored in a cookie (no URL change); English falls back to Norwegian when a text is empty.
- **Admin** at `/admin` (Norwegian only) - project CRUD with image upload/ordering/gallery widths, shared tech list, lessons, drag-to-reorder, "currently building" card, about text/photo/tools/contact, CV upload.
- **Auth** - username + password (bcrypt), DB-backed sessions in an httpOnly cookie, login throttling. The admin user is created from the command line (below); there is no sign-up page.
- **Uploads** - images (converted to WebP, max 2400 px) and the CV PDF are stored on disk in `UPLOAD_DIR` and served through `/uploads/...` and `/cv`.

## Local development

Requires Node 22, pnpm and Docker (for the dev database).

```sh
pnpm install
cp .env.example .env          # defaults match docker-compose.dev.yml
pnpm db:up                    # Postgres 16 on localhost:5433
pnpm db:migrate               # apply migrations
pnpm db:seed                  # placeholder projects (only into an empty database)
pnpm admin:create             # prompts for username and password
pnpm dev                      # http://localhost:3100
```

Other scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Configuration (`.env`)

| Variable       | Purpose                                                         |
| -------------- | --------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                                    |
| `UPLOAD_DIR`   | Where uploaded files are stored (`/app/uploads` in the image)   |
| `PORT`         | Port the app listens on (3100)                                  |

## Deployment

Same flow as the zellstrikka project: a push to `main` runs CI (`.github/workflows/ci.yml`), copies the build context to the server over SSH and runs `scripts/deploy.sh`, which builds the image, starts it, waits for the health check and **rolls back to the previous image if the new one isn't healthy**.

### GitHub secrets

`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `PORTFOLIO_PATH` (folder on the server that holds `docker-compose.yml` and `.env`).

### First-time server setup

1. **Database** in the shared PostgreSQL - a separate database and user:
   ```sql
   CREATE USER portfolio WITH PASSWORD '...';
   CREATE DATABASE portfolio OWNER portfolio;
   ```
2. **Folder** `PORTFOLIO_PATH` with:
   - `docker-compose.yml` - start from `docker-compose.prod.example.yml` and set the name of the Docker network the shared Postgres is on.
   - `.env` - start from `.env.example`; set `DATABASE_URL` to the shared Postgres (use its container name as host when on the same Docker network) and keep `UPLOAD_DIR=/app/uploads`.
   CI never overwrites these two files.
3. Push to `main` (or run the workflow manually). The container applies pending migrations on every start (`prisma migrate deploy`).
4. **Create the admin user** on the server:
   ```sh
   docker compose exec portfolio node scripts/admin-create.mjs
   ```
   Running it again with the same username resets the password and signs out all sessions.
5. Open `/admin`, then fill in "Forside, om meg og CV". You don't need to run the seed in production - add real projects in the admin.

### Reverse proxy requirements

The container listens on `127.0.0.1:3100`. Your web server should proxy the domain to it and:

- forward `Host`/`X-Forwarded-Host` (Server Actions reject requests whose `Origin` doesn't match the forwarded host);
- set `X-Real-IP` to the real client address (nginx: `proxy_set_header X-Real-IP $remote_addr;`). The login throttle uses it, and falls back to the *last* `X-Forwarded-For` entry. Never let a client-supplied `X-Real-IP` pass through;
- allow request bodies of at least **20 MB** (e.g. nginx `client_max_body_size 20m;`), since images are uploaded through Server Actions.

### Rollback

```sh
docker images portfolio                       # deployed SHAs are the tags
ROLLBACK_TO=<sha> sh scripts/deploy.sh        # run in PORTFOLIO_PATH
```

### Migrations

Migrations run on container start, before the health check. If a deploy becomes unhealthy, `deploy.sh` rolls the image back, but Prisma never reverts migrations, so the previous version then runs against the new schema (the script prints which migrations were involved). Keep every migration backward compatible with the version before it:

- adding tables, nullable columns or columns with a default is safe;
- to rename or remove a column, do it in two deploys: first stop using it in code, then drop it in a later migration.

## Project layout

```
src/app/(public)/        public pages            src/app/admin/        admin (login + protected area)
src/components/          ui / public / admin     src/server/actions/   Server Actions (all call requireAdmin())
src/lib/                 db, auth, i18n, uploads, validation, queries
prisma/                  schema, migrations, seed    scripts/  admin-create + deploy.sh
```

Design source: the "Portfolio - Marius" Claude design canvas (colour palette: sand `#F3EEE3`, forest `#1F4D3A`, gold `#E3B744`, ink `#2B2A24`; Fraunces / Inter / JetBrains Mono).
# portfolio
