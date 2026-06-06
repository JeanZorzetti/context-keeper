# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy web app and dependencies
COPY apps/web ./apps/web
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

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
