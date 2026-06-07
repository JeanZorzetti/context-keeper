# Stage 1: Build
FROM node:22-alpine AS builder

# Use pnpm — the declared workspace package manager
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first for layer cache efficiency
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/daemon/package.json ./packages/daemon/package.json
COPY packages/mcp/package.json ./packages/mcp/package.json

# Install via pnpm workspace — frozen-lockfile enforces reproducible builds
RUN pnpm install --frozen-lockfile

# Copy web app source
COPY apps/web ./apps/web

# Generate Prisma client (required before TypeScript build)
# DATABASE_URL is required by prisma.config.ts env() even for generate; use a dummy for build time
RUN cd apps/web && DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy pnpm exec prisma generate

# Build the application
ENV NODE_ENV=production
RUN pnpm --filter web build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Standalone output already bundles traced runtime deps — no full node_modules needed
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/prisma ./prisma
COPY --from=builder /app/apps/web/prisma.config.ts ./

# Install prisma CLI for `migrate deploy` at startup; done here (build time) not in CMD
RUN npm install prisma --no-save

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Migrate then start via standalone server (no next start / no full node_modules)
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
