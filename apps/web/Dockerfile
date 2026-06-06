# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app/apps/web

# Copy web app
COPY apps/web ./

# Install dependencies
RUN npm install

# Generate Prisma client (required before TypeScript build)
RUN npx prisma generate

# Build the application
RUN npm run build

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
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
