# 🚀 Effect TS Enrichment - Quick Start

Complete Bun + ElysiaJS + Effect TS setup with waterfall enrichment pattern.

## ✅ What's Been Built

### Backend (API)
- ✅ **Effect TS Enrichment Service** with waterfall pattern (A → B → C)
- ✅ **Automatic retries** with exponential backoff
- ✅ **No try/catch** - all errors handled via Effect
- ✅ **Vercel AI SDK** wrapped in Effects
- ✅ **ElysiaJS routes** with full Swagger documentation
- ✅ **Elysia Eden** for type-safe client export

### Frontend (Web)
- ✅ **Eden client** with end-to-end type safety
- ✅ **Demo page** at `/demo/effect`
- ✅ **React Query** ready for integration

---

## 📦 Installation

All dependencies are already installed:

**API:**
- `effect` - Functional error handling
- `@effect/schema` - Schema validation
- `ai` - Vercel AI SDK
- `@elysiajs/eden` - Type-safe client
- `elysia` - Web framework

**Web:**
- `@elysiajs/eden` - Type-safe client library

---

## 🏃 Running the System

### Start API Server

```bash
cd apps/api
bun run dev
```

Server runs on: `http://localhost:3001`

### Start Frontend

```bash
cd apps/web
pnpm dev
```

Frontend runs on: `http://localhost:3000`

### Access Points

- **Demo Page**: http://localhost:3000/demo/effect
- **API Docs**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/effect/health

---

## 🧪 Testing

### Quick Test

```bash
cd apps/api
./test-effect-api.sh
```

### Manual cURL Tests

```bash
# Health check
curl http://localhost:3001/effect/health

# Single enrichment
curl -X POST http://localhost:3001/effect/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "userId": "test",
    "budgetCents": 100
  }'

# Batch enrichment
curl -X POST http://localhost:3001/effect/demo/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://a.com", "https://b.com"],
    "budgetPerUrl": 50
  }'
```

---

## 📁 Key Files

### Backend Core

| File | Purpose |
|------|---------|
| [`services/effect-enrichment.ts`](src/services/effect-enrichment.ts) | Effect TS enrichment with waterfall pattern |
| [`services/effect-ai.ts`](src/services/effect-ai.ts) | Vercel AI SDK wrapped in Effects |
| [`routes/effect-enrich.ts`](src/routes/effect-enrich.ts) | ElysiaJS routes for enrichment |
| [`server.ts`](src/server.ts) | Main server with Eden type exports |

### Frontend Core

| File | Purpose |
|------|---------|
| [`lib/eden-client.ts`](../web/lib/eden-client.ts) | Type-safe Eden API client |
| [`app/demo/effect/page.tsx`](../web/app/demo/effect/page.tsx) | Demo UI for testing |

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Demo Page (/demo/effect)                            │   │
│  │  - Form inputs (URL, budget)                         │   │
│  │  - Real-time results display                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Eden Client (lib/eden-client.ts)                    │   │
│  │  - Fully type-safe                                   │   │
│  │  - Auto-completion                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP/JSON
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Bun + Elysia)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes (routes/effect-enrich.ts)                    │   │
│  │  - POST /effect/enrich                               │   │
│  │  - POST /effect/enrich-with-ai                       │   │
│  │  - POST /effect/demo/batch                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  EnrichmentService (Effect TS)                       │   │
│  │                                                       │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌────────────┐ │   │
│  │  │ Provider A  │ → │ Provider B  │ → │ Provider C │ │   │
│  │  │  10¢, 30%   │   │  25¢, 60%   │   │  50¢, 90%  │ │   │
│  │  └─────────────┘   └─────────────┘   └────────────┘ │   │
│  │                                                       │   │
│  │  • Automatic retries (exponential backoff)           │   │
│  │  • Budget enforcement                                │   │
│  │  • Effect-based error handling (no try/catch)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓ (optional)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AI Service (Vercel AI SDK + Effect)                 │   │
│  │  - Extract structured data                           │   │
│  │  - Company analysis                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 How It Works

### 1. **Waterfall Pattern**

The enrichment tries providers sequentially:

```typescript
ProviderA (10¢) → [FAIL] → ProviderB (25¢) → [FAIL] → ProviderC (50¢) → [SUCCESS]
```

Each provider:
- Has a cost (deducted from budget)
- Has a reliability percentage (simulated)
- Includes automatic retries with exponential backoff

### 2. **Effect TS Error Handling**

No `try/catch` blocks. Errors are values:

```typescript
const result = yield* _(
  provider.lookup(url),
  Effect.retry(retryPolicy),
  Effect.either // Convert to Either<Error, Success>
);

if (result._tag === 'Right') {
  // Success!
} else {
  // Handle specific error type
}
```

### 3. **Type-Safe API Calls**

Eden provides full type inference from backend to frontend:

```typescript
// Frontend gets full autocomplete!
const { data } = await api.effect.enrich.post({
  url: 'https://example.com',
  userId: 'user-123',
  budgetCents: 100
});

// TypeScript knows exact response shape
if (data?.success) {
  console.log(data.result.provider); // ✅ Type-safe
}
```

---

## 🔧 Customization

### Adjust Provider Costs

Edit [`effect-enrichment.ts`](src/services/effect-enrichment.ts):

```typescript
export const ProviderA: EnrichmentProvider = {
  name: 'ProviderA',
  costCents: 10, // Change this
  lookup: (url: string) => { ... }
};
```

### Change Retry Policy

```typescript
export const retryPolicy = pipe(
  Schedule.exponential('1 second'), // Initial delay
  Schedule.compose(Schedule.recurs(2)), // Max 3 attempts
);
```

### Add Real Providers

Replace mock providers with actual API calls:

```typescript
export const RealProvider: EnrichmentProvider = {
  name: 'Clearbit',
  costCents: 50,
  lookup: (url: string) =>
    Effect.tryPromise({
      try: () => fetch(`https://api.clearbit.com/v2/companies/find?domain=${url}`),
      catch: (error) => new ProviderError('Clearbit', 'API call failed', error),
    }),
};
```

---

## 📊 Provider Configuration

| Provider | Cost | Reliability | Latency | Use Case |
|----------|------|-------------|---------|----------|
| **A** | 10¢ | 30% | 200ms | Fast, cheap, unreliable |
| **B** | 25¢ | 60% | 400ms | Balanced option |
| **C** | 50¢ | 90% | 600ms | Expensive but reliable |

Try different budgets to see different providers activate:
- **15¢**: Only A can run
- **30¢**: A + B fallback
- **60¢+**: Full waterfall A → B → C

---

## 🎓 Learning Resources

### Effect TS
- [Official Docs](https://effect.website/)
- [Error Handling Guide](https://effect.website/docs/guides/error-handling)
- [Retry Policies](https://effect.website/docs/scheduling/introduction)

### ElysiaJS
- [Getting Started](https://elysiajs.com/quick-start.html)
- [Eden Documentation](https://elysiajs.com/eden/overview.html)
- [Swagger Plugin](https://elysiajs.com/plugins/swagger.html)

### Vercel AI SDK
- [Core API](https://sdk.vercel.ai/docs/ai-sdk-core)
- [Generate Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text)
- [Generate Object](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)

---

## 🐛 Troubleshooting

### Port 3001 in use

```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 bun run dev
```

### Prisma client not generated

```bash
cd apps/api
bunx prisma generate
```

### Type errors in Eden client

Make sure both frontend and backend are using latest code:

```bash
# Restart both servers
cd apps/api && bun run dev
cd apps/web && pnpm dev
```

---

## 📝 Next Steps

1. **Add Real Providers**: Replace mock providers with actual APIs
2. **Implement AI Analysis**: Set up OpenAI/Anthropic API keys
3. **Add Caching**: Use Redis to cache enrichment results
4. **Queue Processing**: Use BullMQ for async enrichment jobs
5. **Rate Limiting**: Add rate limits per provider
6. **Metrics**: Track success rates, costs, latency

---

## ✅ Checklist

- [x] Bun + ElysiaJS setup
- [x] Effect TS enrichment service
- [x] Waterfall pattern implementation
- [x] Automatic retry logic
- [x] Budget management
- [x] Error handling (no try/catch)
- [x] Vercel AI SDK integration
- [x] Eden type-safe client
- [x] Demo UI page
- [x] Swagger documentation
- [x] Test scripts

---

**Built with Effect TS for production-ready error handling** 🚀

For detailed documentation, see [EFFECT_README.md](EFFECT_README.md)
