# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web

# Install web-specific dependencies if needed
WORKDIR /app/apps/web
RUN pnpm install

# Build the Next.js application
RUN pnpm build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm in production image
RUN npm install -g pnpm@9.0.0

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

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

# Start the application
CMD ["pnpm", "start"]
