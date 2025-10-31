# Multi-stage Dockerfile for SGD Backend
# Following LEGENDARYUM pattern

ARG BUN_VERSION=alpine
FROM oven/bun:${BUN_VERSION} AS base
WORKDIR /app

# Dependencies stage
FROM base AS dependencies

COPY --link package.json bun.lockb* ./

# Install production dependencies
RUN bun install --production --frozen-lockfile

# Builder stage
FROM dependencies AS builder

COPY --link . ./

# Install all dependencies (including dev)
RUN bun install --frozen-lockfile

# Build the application
RUN bun run build

# Runner stage
FROM base AS runner

# Use non-root user
USER bun

# Labels
LABEL service="sgd-backend"
LABEL version="2.0.0"

# Environment
ARG ENVIRONMENT=production
ENV NODE_ENV=${ENVIRONMENT}

# Copy built application
COPY --link --from=builder --chown=1000:1000 /app/dist ./dist
COPY --link --from=dependencies --chown=1000:1000 /app/node_modules ./node_modules
COPY --link --chown=1000:1000 package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/health/live || exit 1

# Expose port
EXPOSE 5000

# Start the application
CMD ["bun", "run", "--bun", "dist/server.js"]



