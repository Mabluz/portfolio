# ---- Build stage ------------------------------------------------------------
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
# prisma.config.ts needs a DATABASE_URL to load; the value is never used to connect during the build
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm exec prisma generate

COPY next.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts
RUN pnpm build

# Single-file admin CLI (so the runtime image doesn't need tsx or the dev dependencies)
# ESM output because the generated Prisma client uses import.meta.url; the banner lets bundled CJS deps call require().
RUN pnpm exec esbuild scripts/admin-create.ts --bundle --platform=node --format=esm \
    --banner:js="import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" \
    --external:pg-native --outfile=dist-scripts/admin-create.mjs

# ---- Runtime stage ----------------------------------------------------------
FROM node:22-alpine AS runtime
RUN apk add --no-cache su-exec wget

ENV NODE_ENV=production \
    PORT=3100 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads \
    NEXT_TELEMETRY_DISABLED=1

# Prisma CLI in its own folder: used only by the entrypoint to run `migrate deploy`
WORKDIR /opt/migrate
RUN printf '{"name":"migrate","private":true}' > package.json \
    && npm install --omit=dev --no-audit --no-fund prisma@7.10.1 dotenv \
    && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.ts ./

WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/dist-scripts/admin-create.mjs ./scripts/admin-create.mjs
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

EXPOSE 3100
VOLUME ["/app/uploads"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
