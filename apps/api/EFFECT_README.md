# Effect TS Enrichment System

A high-performance data enrichment platform built with **Bun**, **ElysiaJS**, **Effect TS**, and **Vercel AI SDK**.

## 🏗️ Architecture

### Tech Stack

- **Runtime**: Bun (fast JavaScript runtime)
- **API Framework**: ElysiaJS (high-performance TypeScript framework)
- **Type Safety**: Elysia Eden (end-to-end type safety)
- **Business Logic**: Effect TS (functional error handling, retries, composition)
- **AI Integration**: Vercel AI SDK (wrapped in Effects)
- **Frontend**: Next.js 16 with React 19

### Key Features

✅ **No try/catch** - All error handling via Effect TS
✅ **Waterfall Pattern** - Provider A → B → C with automatic fallback
✅ **Automatic Retries** - Exponential backoff with configurable policies
✅ **Type-Safe API** - Full type safety from backend to frontend via Eden
✅ **Budget Management** - Cost tracking and budget enforcement
✅ **Composable Effects** - Clean, functional business logic

---

## 📁 Project Structure

```
apps/api/src/
├── services/
│   ├── effect-enrichment.ts    # Core Effect TS enrichment service
│   └── effect-ai.ts             # Vercel AI SDK with Effect wrapper
├── routes/
│   └── effect-enrich.ts         # ElysiaJS routes with Eden types
└── server.ts                    # Main server with type exports

apps/web/
├── lib/
│   └── eden-client.ts           # Type-safe Eden client
└── app/demo/effect/
    └── page.tsx                 # Demo page showcasing enrichment
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd apps/api
pnpm install

cd ../web
pnpm install
```

### 2. Start the API Server

```bash
cd apps/api
bun run dev
```

The API will run on `http://localhost:3001`

### 3. Start the Frontend

```bash
cd apps/web
pnpm dev
```

The frontend will run on `http://localhost:3000`

### 4. Access the Demo

Visit: `http://localhost:3000/demo/effect`

---

## 📖 API Documentation

### Swagger UI

Access interactive API docs: `http://localhost:3001/docs`

### Endpoints

#### 1. **POST /effect/enrich**

Enrich a single URL using the waterfall pattern.

**Request:**
```json
{
  "url": "https://example.com",
  "userId": "user-123",
  "budgetCents": 100
}
```

**Success Response (200):**
```json
{
  "success": true,
  "result": {
    "success": true,
    "data": { ... },
    "provider": "ProviderB",
    "costCents": 25,
    "attempts": 2,
    "timestamp": "2025-12-30T..."
  }
}
```

**Error Responses:**
- `400` - Validation Error
- `402` - Budget Exceeded
- `503` - All Providers Failed

#### 2. **POST /effect/enrich-with-ai**

Enrich URL and analyze with AI (requires API key setup).

#### 3. **POST /effect/demo/batch**

Batch enrich multiple URLs (max 10).

**Request:**
```json
{
  "urls": [
    "https://example1.com",
    "https://example2.com"
  ],
  "budgetPerUrl": 100
}
```

#### 4. **GET /effect/health**

Health check for Effect enrichment service.

---

## 💻 Code Examples

### Backend: Effect TS Service

```typescript
import { Effect } from 'effect';
import { runEnrichment } from './services/effect-enrichment';

// Enrich with automatic retries and fallbacks
const result = await runEnrichment({
  url: 'https://example.com',
  userId: 'user-123',
  budgetCents: 100
});

// Or compose with other Effects
const program = Effect.gen(function* (_) {
  const enrichment = yield* _(waterfallEnrichment(input));
  const aiAnalysis = yield* _(extractCompanyDataWithAI(model, enrichment.data));
  
  return { enrichment, aiAnalysis };
});

await Effect.runPromise(program);
```

### Frontend: Eden Client

```typescript
import { api } from '@/lib/eden-client';

// Type-safe API call - full autocomplete!
const { data, error } = await api.effect.enrich.post({
  url: 'https://example.com',
  userId: 'user-123',
  budgetCents: 100
});

if (data?.success) {
  console.log('Provider:', data.result.provider);
  console.log('Cost:', data.result.costCents);
}
```

---

## 🔧 Configuration

### Provider Costs

| Provider | Cost (¢) | Reliability | Latency |
|----------|----------|-------------|---------|
| A        | 10       | 30%         | 200ms   |
| B        | 25       | 60%         | 400ms   |
| C        | 50       | 90%         | 600ms   |

### Retry Policy

```typescript
// Exponential backoff: 1s, 2s, 4s (max 3 attempts)
const retryPolicy = pipe(
  Schedule.exponential('1 second'),
  Schedule.compose(Schedule.recurs(2))
);
```

Customize in [`effect-enrichment.ts`](apps/api/src/services/effect-enrichment.ts#L168)

---

## 🧪 Testing the System

### Test Single Enrichment

```bash
curl -X POST http://localhost:3001/effect/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "userId": "test-user",
    "budgetCents": 100
  }'
```

### Test Batch Enrichment

```bash
curl -X POST http://localhost:3001/effect/demo/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://a.com", "https://b.com"],
    "budgetPerUrl": 50
  }'
```

---

## 🎯 Key Patterns

### 1. Waterfall Enrichment

Tries providers sequentially until success:

```typescript
for (const provider of [ProviderA, ProviderB, ProviderC]) {
  const result = yield* _(tryProvider(provider, url, budget), Effect.either);
  
  if (result._tag === 'Right') {
    return result.right; // Success!
  }
  
  // Continue to next provider...
}
```

### 2. Effect-based Error Handling

No `try/catch` - all errors are values:

```typescript
const program = Effect.gen(function* (_) {
  const data = yield* _(provider.lookup(url)); // May fail
  return data;
}).pipe(
  Effect.retry(retryPolicy),
  Effect.catchAll(handleError)
);
```

### 3. Type-Safe Client-Server Communication

Eden provides full type inference:

```typescript
// Backend exports App type
export type App = ReturnType<typeof buildApp>;

// Frontend uses treaty with type parameter
export const api = treaty<App>(API_URL);

// Now you get autocomplete and type checking!
```

---

## 📚 Learn More

### Effect TS Resources

- [Effect Documentation](https://effect.website/)
- [Effect Schema](https://effect.website/docs/schema/introduction)
- [Effect Retry Policies](https://effect.website/docs/scheduling/introduction)

### ElysiaJS Resources

- [ElysiaJS Docs](https://elysiajs.com/)
- [Elysia Eden](https://elysiajs.com/eden/overview.html)
- [Elysia Swagger](https://elysiajs.com/plugins/swagger.html)

### Vercel AI SDK

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI Core API](https://sdk.vercel.ai/docs/ai-sdk-core)

---

## 🤝 Contributing

This is a demo/reference implementation. Feel free to:

1. Modify provider logic in [`effect-enrichment.ts`](apps/api/src/services/effect-enrichment.ts)
2. Add new routes in [`effect-enrich.ts`](apps/api/src/routes/effect-enrich.ts)
3. Customize retry policies and error handling
4. Integrate real enrichment providers

---

## 📝 License

MIT

---

## 🎉 Quick Tips

1. **Watch the logs**: The Effect service logs each step - watch the console!
2. **Adjust budget**: Try different budgets to see different providers activate
3. **Test failures**: The mock providers have built-in failure rates
4. **Type safety**: Remove a field in the API call - your IDE will catch it!
5. **Explore Swagger**: Visit `/docs` to see all available endpoints

---

Built with ❤️ using Effect TS, ElysiaJS, and Bun
