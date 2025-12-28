# Stage 1: Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui

# Install dependencies using pnpm (via bunx) to respect pnpm-lock
RUN bunx --bun pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web

# Build the Next.js application
WORKDIR /app/apps/web
RUN bunx --bun pnpm build

# Stage 2: Production stage
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui

# Install all dependencies (including dev for dev mode) using pnpm
RUN bunx --bun pnpm install --frozen-lockfile

# Copy built application and public files from builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.js ./apps/web/

WORKDIR /app/apps/web

# Expose port (default 3000 for Next.js)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application (production)
CMD ["bunx", "--bun", "pnpm", "start"]
