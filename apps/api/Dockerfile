# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY packages/types ./packages/types

# Use pnpm via bunx to honor pnpm-lock.yaml with BuildKit cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    bunx --bun pnpm install --frozen-lockfile

FROM base AS runtime
COPY --from=install /app /app
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY packages ./packages

WORKDIR /app/apps/api
RUN bunx prisma generate

EXPOSE 3001
ENV NODE_ENV=development
ENV PORT=3001

CMD ["bun", "run", "--watch", "src/index.ts"]
