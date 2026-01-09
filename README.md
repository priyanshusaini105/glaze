<p align="center">
  <img src="public/img/glaze-hero.png" alt="Glaze - The Agentic Spreadsheet" width="100%" />
</p>

<h1 align="center">✨ Glaze</h1>

<p align="center">
  <strong>The Agentic Spreadsheet That Feels Alive</strong>
</p>

<p align="center">
  AI agents work directly inside your grid, enriching your data with transparent, streaming AI workflows. Stop waiting for spinners.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#documentation">Documentation</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node Version" />
  <img src="https://img.shields.io/badge/bun-%3E%3D1.0-orange.svg" alt="Bun Version" />
  <img src="https://img.shields.io/badge/pnpm-9.0.0-yellow.svg" alt="PNPM Version" />
</p>

---

## 🎯 What is Glaze?

Glaze is a **high-performance data enrichment platform** that transforms static spreadsheets into dynamic, AI-powered workflows. Unlike traditional data tools that make you wait for batch processing, Glaze's agentic architecture provides **real-time, streaming enrichment** directly in your grid.

### The Problem

- Traditional enrichment tools require manual data export/import cycles
- Batch processing means waiting minutes or hours for results
- No visibility into what's happening during processing
- Fragmented data from multiple providers requires manual merging

### The Glaze Solution

- **Live enrichment** happens directly in your spreadsheet cells
- **Streaming results** show progress in real-time
- **Multi-provider intelligence** automatically sources the best data
- **AI-powered gap filling** when providers can't find data

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 Agentic Enrichment
AI agents autonomously enrich your data using multiple providers with intelligent fallback strategies.

### 📊 Real-time Streaming
Watch your data come alive with streaming updates - no more waiting for batch jobs.

### 🔄 Multi-Provider Intelligence
Automatically sources data from LinkedIn, websites, search APIs, and AI with confidence scoring.

</td>
<td width="50%">

### 💾 Smart Caching
Redis-backed 7-day cache eliminates redundant API calls and reduces costs.

### 🎯 High Confidence Data
Every field includes confidence scores and source attribution.

### ⚡ Blazing Fast
Built on Bun and Elysia for maximum performance with minimal overhead.

</td>
</tr>
</table>

---

## 🏗️ Architecture

Glaze uses a **waterfall architecture** with distinct layers that enable scalable, maintainable data enrichment:

```
                              ┌─────────────────────────────────────────┐
                              │           🌐 WEB APPLICATION            │
                              │         (Next.js + React)               │
                              │  • Interactive spreadsheet UI           │
                              │  • Real-time streaming updates          │
                              │  • Data visualization dashboard         │
                              └──────────────────┬──────────────────────┘
                                                 │
                                          HTTP/REST API
                                                 │
                              ┌──────────────────▼──────────────────────┐
                              │           ⚡ API SERVER                 │
                              │            (Elysia + Bun)               │
                              │  • REST endpoints & authentication     │
                              │  • Request validation & routing         │
                              │  • WebSocket connections                │
                              │  • Swagger documentation                │
                              └──────────────────┬──────────────────────┘
                                                 │
                              ┌──────────────────▼──────────────────────┐
                              │         📋 TASK ORCHESTRATOR            │
                              │           (Trigger.dev v3)              │
                              │  • Job queuing & scheduling             │
                              │  • Retry logic & error handling         │
                              │  • Concurrent task management           │
                              │  • Background job processing            │
                              └──────────────────┬──────────────────────┘
                                                 │
                              ┌──────────────────▼──────────────────────┐
                              │       🔧 ENRICHMENT PIPELINE            │
                              │                                         │
                              │   ┌─────────────────────────────────┐   │
                              │   │        PROVIDER LAYER           │   │
                              │   │                                 │   │
                              │   │  ┌─────────┐ ┌─────────────┐   │   │
                              │   │  │LinkedIn │ │ Website     │   │   │
                              │   │  │Provider │ │ Scraper     │   │   │
                              │   │  │  (95%)  │ │   (80%)     │   │   │
                              │   │  └─────────┘ └─────────────┘   │   │
                              │   │                                 │   │
                              │   │  ┌─────────┐ ┌─────────────┐   │   │
                              │   │  │ Search  │ │    LLM      │   │   │
                              │   │  │ APIs    │ │  Fallback   │   │   │
                              │   │  │  (70%)  │ │   (60%)     │   │   │
                              │   │  └─────────┘ └─────────────┘   │   │
                              │   └─────────────────────────────────┘   │
                              └──────────────────┬──────────────────────┘
                                                 │
                    ┌────────────────────────────┴────────────────────────────┐
                    │                                                         │
         ┌──────────▼──────────┐                              ┌───────────────▼───────────┐
         │    🗃️ PostgreSQL    │                              │      🚀 Redis Cache       │
         │   (Persistent)      │                              │      (Fast Access)        │
         │  • Table storage    │                              │  • 7-day TTL cache        │
         │  • User data        │                              │  • Response caching       │
         │  • Job history      │                              │  • Real-time pub/sub      │
         └─────────────────────┘                              └───────────────────────────┘
```

### Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          ENRICHMENT PIPELINE STAGES                            │
└────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ 1.Cache │────▶│2.LinkedIn────▶│3.Website│────▶│4.Search │────▶│ 5.Gap   │
    │  Check  │     │ Provider│     │ Scraper │     │ Service │     │Analysis │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │                                                               │
         │ HIT                                                           │
         ▼                                                               ▼
    ┌─────────┐                                                    ┌─────────┐
    │  Return │                                                    │ 6. LLM  │
    │  Cached │                                                    │Fallback │
    └─────────┘                                                    └─────────┘
                                                                         │
                                                                         ▼
                   ┌─────────────────────────────────────────────────────────┐
                   │  7. MERGE & VALIDATE  ──▶  8. STORE & CACHE  ──▶  DONE  │
                   └─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

This is a [pnpm workspaces](https://pnpm.io/workspaces) monorepo organized as follows:

```
glaze/
├── 📱 apps/
│   ├── api/            # Elysia HTTP server + REST endpoints
│   ├── web/            # Next.js frontend + spreadsheet UI
│   ├── workflows/      # Trigger.dev task definitions
│   └── worker/         # (Deprecated) Legacy BullMQ worker
│
├── 📦 packages/
│   ├── types/          # Shared TypeScript definitions
│   ├── ui/             # Shared React components
│   └── trigger/        # Legacy trigger config
│
├── 📜 scripts/         # Development & deployment helpers
├── 📚 docs/            # Architecture & API documentation
└── ⚙️ config           # Root configuration files
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | ≥ 18    |
| Bun         | ≥ 1.0   |
| PostgreSQL  | ≥ 14    |
| Redis       | ≥ 6     |

### Installation

```bash
# Clone the repository
git clone https://github.com/priyanshusaini105/glaze.git
cd glaze

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Set up database
cd apps/api && pnpm run prisma:migrate:dev && cd ../..

# Start all services
./scripts/dev-all.sh
```

### Service URLs

| Service   | URL                          | Description          |
|-----------|------------------------------|----------------------|
| Web UI    | http://localhost:3000        | Spreadsheet interface |
| API       | http://localhost:3001        | REST API server       |
| API Docs  | http://localhost:3001/docs   | Swagger documentation |

---

## 🛠️ Tech Stack

<table>
<tr>
<td>

### Backend
- **Runtime**: Bun + Node.js
- **API**: Elysia (TypeScript)
- **Database**: PostgreSQL + Prisma
- **Cache**: Redis + ioredis
- **Queue**: Trigger.dev v3

</td>
<td>

### Frontend
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **UI Libraries**: Shadcn/ui, AG Grid
- **State**: React Query

</td>
<td>

### Enrichment
- **Orchestration**: Trigger.dev
- **AI/LLM**: Anthropic Claude
- **Scraping**: Cheerio
- **Search**: Serper API

</td>
</tr>
</table>

---

## 📊 Pipeline Performance

| Stage | Duration | Cost/Request | Confidence |
|-------|----------|--------------|------------|
| Cache Hit | <10ms | $0 | 95% |
| LinkedIn Provider | 500ms-2s | $0.01-0.05 | 95% |
| Website Scraper | 2-5s | $0 | 70-80% |
| Search Service | 1-2s | $0.02 | 70% |
| LLM Fallback | 1-3s | $0.02-0.05 | 60% |
| **Total (uncached)** | **2-10s** | **$0.05-0.15** | **90%** |

---

## 🔧 Development Commands

```bash
# Start all services
pnpm dev

# Start individual services
pnpm dev:api          # API server only
pnpm dev:web          # Web frontend only
pnpm dev:workflows    # Trigger.dev workflows

# Database operations
cd apps/api
pnpm run prisma:studio        # Open database UI
pnpm run prisma:migrate:dev   # Run migrations

# Code quality
pnpm check-types      # TypeScript validation
pnpm lint             # ESLint checks
pnpm format           # Prettier formatting
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/glaze

# Redis
REDIS_URL=redis://localhost:6379

# API Server
PORT=3001
API_URL=http://localhost:3001

# LLM Provider
LLM_PROVIDER=anthropic
LLM_API_KEY=your_api_key
LLM_MODEL=claude-3-sonnet-20240229

# Trigger.dev
TRIGGER_API_KEY=your_trigger_key

# Search API
SERPER_API_KEY=your_serper_key
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture Guide](docs/ARCHITECTURE.md) | System design & data flow |
| [Contributors Guide](docs/CONTRIBUTORS.md) | Development setup & guidelines |
| [API Documentation](apps/api/README.md) | REST endpoints reference |
| [Workflows Guide](apps/workflows/README.md) | Trigger.dev task definitions |

---

## 🐛 Troubleshooting

<details>
<summary><strong>Database connection errors</strong></summary>

```bash
# Verify PostgreSQL is running
psql -h localhost -U postgres

# Check DATABASE_URL in .env
# Run migrations
cd apps/api && pnpm run prisma:migrate:dev
```
</details>

<details>
<summary><strong>Redis connection issues</strong></summary>

```bash
# Test Redis connection
redis-cli PING

# Verify REDIS_URL in .env
```
</details>

<details>
<summary><strong>Type errors</strong></summary>

```bash
# Rebuild types
pnpm check-types

# Clear cache
rm -rf node_modules/.vite
```
</details>

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributors Guide](docs/CONTRIBUTORS.md) for:

- Development environment setup
- Code organization guidelines
- Adding new provider adapters
- Testing procedures

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Status:</strong> Active Development &nbsp;|&nbsp;
  <strong>Last Updated:</strong> January 2026
</p>

<p align="center">
  Built with ❤️ by <a href="https://github.com/priyanshusaini105">@priyanshusaini105</a>
</p>
