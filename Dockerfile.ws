# WebSocket Server Dockerfile

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose WS port
EXPOSE 3001

# Run WebSocket server
CMD ["npm", "run", "ws"]


