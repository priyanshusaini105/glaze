# Use Bun official image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json /temp/dev/
COPY apps/api/package.json /temp/dev/apps/api/
COPY packages/eslint-config /temp/dev/packages/eslint-config
COPY packages/typescript-config /temp/dev/packages/typescript-config
COPY packages/types /temp/dev/packages/types

# Install dependencies with Bun
WORKDIR /temp/dev
RUN bun install --frozen-lockfile

# Copy source code
FROM base AS build
COPY --from=install /temp/dev/node_modules ./node_modules
COPY --from=install /temp/dev/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY package.json pnpm-workspace.yaml ./

# Build the application
WORKDIR /app/apps/api
RUN bun build src/index.ts --outdir ./dist --target bun

# Production image
FROM oven/bun:1-alpine AS release
WORKDIR /app/apps/api

# Copy built application and dependencies
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./
COPY --from=install /temp/dev/apps/api/node_modules ./node_modules

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Run the application
CMD ["bun", "dist/index.js"]
EXPOSE 3001

# Health check

# Run the application
CMD ["bun", "dist/index.js"]
