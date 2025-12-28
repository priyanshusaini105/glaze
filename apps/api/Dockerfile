# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies for build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/

# Build the project
WORKDIR /app/apps/api
RUN pnpm build

# Stage 2: Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm in production image
RUN npm install -g pnpm@9.0.0

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

# Expose port (default 3001 for API)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "dist/index.js"]
