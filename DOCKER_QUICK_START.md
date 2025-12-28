# Glaze Docker Quick Start Guide

## 🚀 Quick Setup (< 2 minutes)

```bash
# 1. Run the setup script
./scripts/docker-setup.sh

# 2. Wait for services to start (about 30-60 seconds)

# 3. Access services
# Frontend:  http://localhost:3000
# API:       http://localhost:3001
# Database:  postgresql://postgres:postgres@localhost:5432/glaze_db
```

## 📊 Status

Check if all services are running:
```bash
docker-compose ps
```

Expected output:
```
NAME                 STATUS
glaze-postgres       Up (healthy)
glaze-api            Up 
glaze-web            Up
```

## 📋 Essential Commands

| Command | Purpose |
|---------|---------|
| `./scripts/docker-setup.sh` | Build and start all services |
| `./scripts/docker-stop.sh` | Stop all services |
| `docker-compose logs -f` | View all logs (real-time) |
| `docker-compose logs -f api` | View API logs only |
| `docker-compose logs -f web` | View frontend logs only |
| `docker-compose logs -f postgres` | View database logs only |
| `docker-compose restart api` | Restart API service |
| `docker-compose down -v` | Stop services and remove volumes |
| `docker-compose exec postgres psql -U postgres -d glaze_db` | Access database |

## 🔧 Environment Variables

Located in `.env.docker`. Default values:
- **PostgreSQL User**: postgres
- **PostgreSQL Password**: postgres
- **Database Name**: glaze_db
- **API Port**: 3001
- **Web Port**: 3000

## 🐛 Troubleshooting

**Services won't start?**
```bash
docker-compose logs
```

**Port already in use?**
Edit `.env.docker` and change ports, then run:
```bash
docker-compose down
docker-compose up -d
```

**Want a fresh start?**
```bash
docker-compose down -v
docker-compose up -d
```

## 📁 What Was Created

✅ `apps/api/Dockerfile` - Multi-stage build for backend  
✅ `apps/web/Dockerfile` - Multi-stage build for frontend  
✅ `docker-compose.yml` - Orchestrates all services  
✅ `.env.docker` - Environment configuration  
✅ `.dockerignore` - Docker build optimizations  
✅ `scripts/docker-setup.sh` - Automated setup script  
✅ `scripts/docker-stop.sh` - Stop services script  
✅ `scripts/init-db.sql` - Database initialization  
✅ `DOCKER.md` - Full documentation  

## 🌐 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Web UI |
| API | http://localhost:3001 | Backend API |
| Database | localhost:5432 | PostgreSQL |

## 💡 Tips

- Services auto-restart on failure
- Code changes auto-reload (hot-reload enabled)
- PostgreSQL data persists in `postgres_data` volume
- All services share the same network (`glaze-network`)

For detailed documentation, see [DOCKER.md](DOCKER.md)
