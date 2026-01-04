# Restructuring Quick Reference

**All reorganization complete!** Use this index to navigate the new structure.

## 📚 Start Here

Choose based on your role:

### 👨‍💻 Developer Setting Up Locally
1. Read: [CONTRIBUTORS.md](/CONTRIBUTORS.md) - Full setup guide
2. Run: `./scripts/dev-all.sh` - Start all services
3. Access: API at http://localhost:3001 with Swagger docs

### 🏗️ Understanding Architecture  
1. Read: [ARCHITECTURE.md](/ARCHITECTURE.md) - Visual diagrams
2. Look at: System components and data flow diagrams
3. Reference: Configuration and deployment sections

### 🔧 Working with Services

#### API Server
- Location: [apps/api/](/apps/api/)
- Purpose: HTTP endpoints, data management
- Start: `cd apps/api && bun run --watch src/index.ts`
- Docs: [apps/api/README.md](/apps/api/README.md)

#### Worker Process
- Location: [apps/worker/](/apps/worker/)
- Purpose: Enrichment pipeline execution
- Start: `./scripts/run-worker.sh`
- Docs: [apps/worker/README.md](/apps/worker/README.md)
- Key Files:
  - [Pipeline logic](apps/worker/src/pipeline.ts)
  - [Provider adapters](apps/worker/src/providers/)
  - **[Isolated LLM client](apps/worker/src/providers/llm-provider.ts)** ← New!

#### Workflows
- Location: [apps/workflows/](/apps/workflows/)
- Purpose: Task definitions and scheduling
- Start: `./scripts/run-workflows.sh`
- Docs: [apps/workflows/README.md](/apps/workflows/README.md)

### 📦 Shared Types

All types are centralized in [packages/types/](/packages/types/):

```typescript
import type {
  EnrichmentJobInput,
  EnrichmentJobResult,
  LinkedInProfile,
  ICPProfile,
  ApiResponse
} from '@types/types';
```

Files:
- [enrichment.ts](packages/types/src/enrichment.ts) - Job schemas
- [linkedin.ts](packages/types/src/linkedin.ts) - LinkedIn structures
- [icp.ts](packages/types/src/icp.ts) - ICP profiles
- [api.ts](packages/types/src/api.ts) - API responses

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Check types (all packages)
pnpm check-types

# Start everything locally
./scripts/dev-all.sh

# Start individual services
./scripts/run-worker.sh      # Worker only
./scripts/run-workflows.sh   # Workflows only

# View database
cd apps/api && pnpm run prisma:studio

# Run tests
pnpm test
```

## 📖 Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](/README.md) | Project overview | Everyone |
| [CONTRIBUTORS.md](/CONTRIBUTORS.md) | Development setup & workflow | Developers |
| [ARCHITECTURE.md](/ARCHITECTURE.md) | System design & diagrams | Architects |
| [RESTRUCTURE_SUMMARY.md](/RESTRUCTURE_SUMMARY.md) | What changed & why | Team leads |
| [RESTRUCTURING_CHECKLIST.md](/RESTRUCTURING_CHECKLIST.md) | Completion status | Project managers |
| [apps/worker/README.md](/apps/worker/README.md) | Worker details | Backend devs |
| [apps/workflows/README.md](/apps/workflows/README.md) | Workflows details | Workflow devs |
| [apps/api/README.md](/apps/api/README.md) | API documentation | API devs |

## 🎯 Key Features of Restructuring

✅ **Workflows** now live in `apps/workflows/` (not isolated in packages)
✅ **Worker** is dedicated process in `apps/worker/`
✅ **Provider Adapters** organized in `apps/worker/src/providers/`
✅ **LLM Client** isolated at `apps/worker/src/providers/llm-provider.ts`
✅ **Shared Types** centralized in `packages/types/`
✅ **Development Scripts** for local testing in `scripts/`
✅ **Comprehensive Docs** for developers and contributors

## 💡 Architecture at a Glance

```
┌─────────────┐
│  REST API   │ ← apps/api/
└──────┬──────┘
       │ Create Job
       ▼
   ┌───────────┐
   │ Redis Q   │
   └─────┬─────┘
         │ Pick Up
         ▼
    ┌────────────┐
    │ Worker     │ ← apps/worker/
    │ - LinkedIn │
    │ - Scraper  │
    │ - Search   │
    │ - LLM      │
    └────┬───────┘
         │
    ┌────┴────────┐
    ▼             ▼
PostgreSQL    Redis Cache
```

## 🔗 Important Connections

**API to Worker**
- Communication: Redis queue
- Job format: `EnrichmentJobInput` type
- Result format: `EnrichmentJobResult` type

**Workflows to Worker**
- Communication: Via API job creation
- Trigger: Task.trigger() method
- Type-safe payloads

**All Services**
- Types: From `packages/types/`
- Config: `.env.local` file
- Logging: `[service]` prefixed

## ⚙️ Configuration

All services use environment variables from `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://...

# Queue & Cache
REDIS_URL=redis://localhost:6379

# API
PORT=3001

# Worker
CONCURRENCY=10

# LLM
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-sonnet-20240229
LLM_API_KEY=xxx
```

## 🆘 Need Help?

| Question | Answer |
|----------|--------|
| How do I set up? | Read [CONTRIBUTORS.md](/CONTRIBUTORS.md) |
| How does it work? | Read [ARCHITECTURE.md](/ARCHITECTURE.md) |
| How do I run it? | Run `./scripts/dev-all.sh` |
| What changed? | Read [RESTRUCTURE_SUMMARY.md](/RESTRUCTURE_SUMMARY.md) |
| Where's code X? | Check [ARCHITECTURE.md](/ARCHITECTURE.md#complete-directory-tree) |
| How to add a provider? | See [apps/worker/README.md](/apps/worker/README.md) |
| How to add a workflow? | See [apps/workflows/README.md](/apps/workflows/README.md) |

## 📊 Project Statistics

- **Lines of Code**: ~1,200 (TypeScript)
- **Documentation**: ~4,500 lines
- **New Files**: 25+
- **Type Files**: 5 (centralized)
- **Provider Adapters**: 4 (extensible)
- **Development Scripts**: 3 (executable)

## ✨ Highlights

🎯 **Type Safety**
- All types in one place
- Zod validation schemas
- No duplication

🚀 **Scalability**
- Worker scales independently
- Multiple instances supported
- Queue-based distribution

📚 **Documentation**
- Comprehensive guides
- Architecture diagrams
- Code examples
- Troubleshooting tips

🛠️ **Developer Experience**
- One-command startup
- Environment management
- Clear structure
- Easy to navigate

---

**Ready to start? Begin with [CONTRIBUTORS.md](/CONTRIBUTORS.md)!**
