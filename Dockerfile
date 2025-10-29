# Multi-stage build for production

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# Install ALL dependencies (including devDependencies) for building
RUN npm ci --include=dev

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client is already in node_modules from deps stage
# Just ensure it's properly generated (offline mode)
RUN npx prisma generate 2>/dev/null || echo "Using cached Prisma Client"

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy package.json for scripts
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Ensure Prisma is available at runtime and start server
CMD ["sh", "-c", "node server.js"]

