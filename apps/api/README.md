# Glaze API - ElysiaJS + Bun

Fast and lightweight API built with ElysiaJS and Bun.

## Features

- 🦊 **ElysiaJS** - Fast and friendly Bun web framework
- 🚀 **Bun Runtime** - Ultra-fast JavaScript runtime
- 🔄 **Hot Reload** - Auto-restart on file changes
- 🐳 **Docker Ready** - Containerized for easy deployment
- 🔌 **CORS Enabled** - Cross-origin resource sharing configured

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Development

```bash
# Install dependencies
bun install

# Run in development mode
bun dev

# Run in production mode
bun start
```

### Docker

```bash
# Build and run with Docker Compose (from root)
docker-compose up api

# Or run all services
docker-compose up
```

## Endpoints

- `GET /` - API information
- `GET /health` - Health check endpoint

## Environment Variables

- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (development/production)

## Project Structure

```
src/
  └── index.ts      # Main application entry point
```
