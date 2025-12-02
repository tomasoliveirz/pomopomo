# WebSocket Server Dockerfile

# Stage 1: Builder
FROM node:20-bullseye-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
# Install all dependencies (including devDependencies for prisma CLI)
ARG CACHEBUST=1
RUN apt-get update -y && apt-get install -y openssl
RUN npm install --verbose --ignore-scripts

COPY . .
# Generate Prisma Client
RUN ls -la && ls -la node_modules || echo "node_modules missing"
RUN ./node_modules/.bin/prisma generate

# Stage 2: Runner
FROM node:20-bullseye-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

ENV NODE_ENV production

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts
RUN npm install -g tsx

# Copy source code
COPY . .

# Copy generated Prisma Client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Expose WS port
EXPOSE 3001

# Run WebSocket server
CMD ["npm", "run", "ws"]


