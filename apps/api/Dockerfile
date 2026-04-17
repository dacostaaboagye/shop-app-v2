FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Build stage ──────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY packages/domain/package.json packages/domain/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY apps/api/ apps/api/

# Build in dependency order
RUN pnpm --filter @shop/contracts build
RUN pnpm --filter @shop/database build
RUN pnpm --filter @shop/domain build
RUN pnpm --filter @shop/api build

# Prune to a self-contained production deployment bundle
RUN pnpm --filter @shop/api deploy --prod /app/out

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 api

COPY --from=builder --chown=api:nodejs /app/out ./

USER api
EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
