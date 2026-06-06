# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lock file and package files from root and apps/web
COPY package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies for the entire monorepo (root lock file includes all deps)
RUN npm ci

# Copy the rest of the web app
COPY apps/web ./apps/web
COPY apps/web/prisma ./apps/web/prisma

# Build the application
WORKDIR /app/apps/web
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/prisma ./prisma

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run migrations and start server
CMD ["sh", "-c", "cd /app/apps/web && npx prisma migrate deploy && node node_modules/.bin/next start"]
