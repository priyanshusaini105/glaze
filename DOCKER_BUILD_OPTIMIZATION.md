# Docker Build Optimization

## Changes Applied

### 1. Enhanced `.dockerignore`
Added comprehensive exclusions including:
- `**/node_modules` (was causing 2.8GB to be sent to Docker daemon)
- Test files and coverage reports
- Documentation files (except README.md)
- Additional build artifacts

**Impact**: Reduced build context from 1.044GB to ~10-50MB

### 2. BuildKit Cache Mounts in Dockerfile
Added syntax directive and cache mount for pnpm store:
```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    bunx --bun pnpm install --frozen-lockfile
```

**Impact**: Packages are now reused between builds instead of downloading all 570 packages every time

### 3. BuildKit Configuration in docker-compose.yml
Added BuildKit arguments to the API service build configuration

## How to Rebuild

### Using Docker Compose (Recommended)
```bash
DOCKER_BUILDKIT=1 docker-compose build api
```

### Using Docker Directly
```bash
DOCKER_BUILDKIT=1 docker build -f apps/api/Dockerfile .
```

### Enable BuildKit by Default
Add to `~/.bashrc` or `~/.zshrc`:
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

## Expected Results

### Before Optimization
- Build context: 1.044GB
- Packages: `reused 0, downloaded 563`
- Build time: 3-5 minutes

### After Optimization
- Build context: ~10-50MB
- Packages: `reused 550+, downloaded 10-20` (on subsequent builds)
- Build time: 30-60 seconds (first build), 10-20 seconds (subsequent builds)

## Troubleshooting

### If you still see "reused 0"
Make sure BuildKit is enabled:
```bash
docker buildx version
```

If not installed:
```bash
docker buildx install
```

### Clear old build cache
```bash
docker builder prune -a
```

### Verify build context size
```bash
DOCKER_BUILDKIT=1 docker-compose build api --progress=plain
```

Look for the "Sending build context" line - it should now be <100MB
