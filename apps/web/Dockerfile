# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy monorepo configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./

# Copy web app and dependencies
COPY apps/web ./apps/web
COPY apps/web/prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
WORKDIR /app/apps/web
RUN pnpm build

# Generate Prisma client
RUN pnpm db:generate

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy necessary files from builder
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/prisma ./prisma

# Copy node_modules from root if monorepo structure needed
# (adjust based on your pnpm setup)

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run migrations and start server
CMD ["sh", "-c", "pnpm db:migrate --skip-generate && node_modules/.bin/next start"]
