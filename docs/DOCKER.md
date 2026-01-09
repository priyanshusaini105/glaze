# Docker Documentation for Glaze

## Overview

This project uses Docker and Docker Compose to orchestrate the following services:
- **PostgreSQL**: Database (port 5432)
- **API**: Backend service running on Node.js (port 3001)
- **Web**: Frontend Next.js application (port 3000)

## Prerequisites

Before running Docker, ensure you have installed:
- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)

Verify installation:
```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Automated Setup (Recommended)

Run the setup script:
```bash
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

### 2. Manual Setup

#### Start Services
```bash
docker-compose up -d
```

#### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

#### Stop Services
```bash
docker-compose down
```

#### Stop and Remove Volumes
```bash
docker-compose down -v
```

## Configuration

### Environment Variables

The `.env.docker` file contains default configurations:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/glaze_db
DATABASE_NAME=glaze_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_PORT=5432

# API
API_PORT=3001
LOG_LEVEL=info

# Web
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

To customize, edit `.env.docker` before running services.

## Service Details

### PostgreSQL
- **Image**: postgres:16-alpine
- **Port**: 5432 (localhost:5432)
- **Volume**: `postgres_data` (persistent storage)
- **Health Check**: Every 10s
- **Initial Scripts**: `scripts/init-db.sql`

### API (Backend)
- **Port**: 3001 (localhost:3001)
- **Framework**: Node.js with Effect
- **Build**: Multi-stage Dockerfile
- **Volumes**: Hot-reload for development (src code mounted)
- **Command**: `pnpm dev`

### Web (Frontend)
- **Port**: 3000 (localhost:3000)
- **Framework**: Next.js 16
- **Build**: Multi-stage Dockerfile
- **Volumes**: Hot-reload for development
- **Command**: `pnpm dev`

## Common Tasks

### Connect to PostgreSQL

From host machine:
```bash
psql postgresql://postgres:postgres@localhost:5432/glaze_db
```

From container:
```bash
docker-compose exec postgres psql -U postgres -d glaze_db
```

### View Service Status
```bash
docker-compose ps
```

### Rebuild Services
```bash
docker-compose build --no-cache
```

### Restart a Specific Service
```bash
docker-compose restart api
docker-compose restart web
docker-compose restart postgres
```

### Execute Commands in Containers

API:
```bash
docker-compose exec api pnpm build
docker-compose exec api pnpm lint
```

Web:
```bash
docker-compose exec web pnpm build
docker-compose exec web pnpm lint
```

### View Full Logs with Timestamps
```bash
docker-compose logs --timestamps -f
```

## Development Workflow

### Working with API Changes
1. Edit files in `apps/api/src`
2. Changes automatically reload (hot-reload via `pnpm dev`)
3. Check logs: `docker-compose logs -f api`

### Working with Web Changes
1. Edit files in `apps/web`
2. Next.js automatically recompiles (hot module replacement)
3. Refresh browser to see changes
4. Check logs: `docker-compose logs -f web`

### Database Schema Changes
If using Prisma:
```bash
docker-compose exec api npx prisma migrate dev --name <migration_name>
```

## Troubleshooting

### Services Not Starting

Check logs:
```bash
docker-compose logs
```

### PostgreSQL Connection Issues

Verify PostgreSQL is healthy:
```bash
docker-compose ps postgres
```

### API/Web Not Responding

Check if containers are running:
```bash
docker-compose ps
```

Restart the service:
```bash
docker-compose restart api
docker-compose restart web
```

### Port Already in Use

Change ports in `.env.docker`:
```env
API_PORT=3002
WEB_PORT=3001
DATABASE_PORT=5433
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Clean Rebuild

Remove everything and start fresh:
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Production Considerations

For production deployments:

1. Update Dockerfiles to remove volume mounts for code
2. Use environment-specific env files
3. Enable logging aggregation
4. Use environment variable secrets management
5. Configure proper resource limits in `docker-compose.yml`
6. Use health checks (already included)
7. Set up monitoring and alerting

## Network Communication

Services communicate over the `glaze-network` bridge:
- API can reach PostgreSQL at: `postgresql://postgres:postgres@postgres:5432/glaze_db`
- Web can reach API at: `http://api:3001` (internal) or `http://localhost:3001` (from host)

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
