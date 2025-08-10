# syntax=docker/dockerfile:1
FROM node:18-slim AS base
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Build stage for TypeScript
FROM node:18-slim AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Runtime image
FROM node:18-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN groupadd -r app && useradd -r -g app app && mkdir -p /app && chown -R app:app /app

# Copy production node_modules and dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json README.md ./

# Adjust ownership
RUN chown -R app:app /app
USER app

# Default to HTTP transport on 3000 (configurable via env)
EXPOSE 3000

ENTRYPOINT ["node", "dist/cli.js"]
# Example: --transport http --httpPort 3000
CMD ["--transport", "http", "--httpPort", "3000"] 