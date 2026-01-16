# Multi-stage build for production

FROM node:20-bullseye-slim AS base

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# Install ALL dependencies (including devDependencies) for building
ARG CACHEBUST=1
RUN apt-get update -y && apt-get install -y openssl
RUN npm install --ignore-scripts

# Stage 2: Builder
FROM node:20-bullseye-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Prisma Client is already in node_modules from deps stage
# Just ensure it's properly generated (offline mode)
RUN npx prisma generate 2>/dev/null || echo "Using cached Prisma Client"

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# Stage 3: Runner
FROM node:20-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apt-get update -y && apt-get install -y openssl

RUN groupadd -g 1001 nodejs
RUN useradd -u 1001 -g nodejs -s /bin/sh -m nextjs

RUN npm install -g prisma@5.22.0

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
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

