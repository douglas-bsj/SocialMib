# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# ─── Deps: install all dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─── Builder: compile Next.js app ─────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Placeholder envs so Next.js "collect page data" can evaluate route modules that
# instantiate SDK clients at import time (Resend/Stripe/OpenAI throw on missing keys).
# These are BUILD-ONLY; real values come from the container env at runtime.
ENV RESEND_API_KEY=re_build_dummy \
    STRIPE_SECRET_KEY=sk_test_build_dummy \
    OPENAI_API_KEY=sk-build-dummy \
    AUTH_SECRET=build_dummy_secret_change_me \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    REDIS_URL=redis://localhost:6379

# Build Next.js (standalone output)
RUN npm run build

# ─── App: minimal Next.js runtime ────────────────────────────────────────────
FROM base AS app
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone output (includes its own node_modules subset)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

# Prisma: schema + generated client (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated   ./src/generated

# Prisma 7 CLI + engines for `migrate deploy` on startup. The standalone bundle
# prunes these, and the Prisma 7 CLI pulls in several @prisma/* packages
# (@prisma/debug, @prisma/get-platform, @prisma/config, ...), so copy the full
# dependency tree — simplest reliable option (overlays the pruned standalone tree).
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma 7 reads the Migrate datasource URL from prisma.config.ts (not the schema).
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts                  ./prisma.config.ts

COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh     ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

# ─── Worker: BullMQ publisher ─────────────────────────────────────────────────
FROM base AS worker
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=deps    --chown=nextjs:nodejs /app/node_modules  ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src           ./src
COPY --from=builder --chown=nextjs:nodejs /app/prisma        ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/scripts       ./scripts

USER nextjs

CMD ["node_modules/.bin/tsx", "src/workers/publisher.ts"]
