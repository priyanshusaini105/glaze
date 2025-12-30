# Backend ICP & Enrichment Plan

## Phase 0: Planning
- [x] Capture requirements and draft phased plan

## Phase 1: Backend scaffolding
- [x] Create folder structure: src/routes, src/services, src/types, src/utils
- [x] Move/organize existing app bootstrap into src/server.ts and route registration into src/routes

## Phase 2: URL validation and parsing
- [x] Implement LinkedIn/GitHub profile URL validator and normalizer (reject others)
- [x] Add lightweight parser to extract username/slug for downstream enrichment

## Phase 3: Minimal ICP endpoint
- [x] Add route POST /icps/resolve that accepts { url: string }
- [x] Return structured shape { source: 'linkedin'|'github', handle: string, profileUrl: string }
- [x] Provide placeholder name until enrichment is implemented

## Phase 4: Testing and docs
- [x] Add manual test steps (curl examples) and expected responses
- [ ] Update root endpoint listing and README/API docs

### Manual test steps (Phase 4)
From apps/api with server running on port 3001:

1) Health
```
curl -s http://localhost:3001/health | jq
```

2) Resolve GitHub profile
```
curl -s -X POST http://localhost:3001/icps/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://github.com/octocat"}' | jq
```
- Expect source github, handle octocat, and null name/headline/location.

3) Resolve LinkedIn profile
```
curl -s -X POST http://localhost:3001/icps/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://www.linkedin.com/in/some-handle"}' | jq
```
- Expect source linkedin, handle some-handle, and best-effort name/headline when public OG tags exist.

4) Error case (unsupported host)
```
curl -s -X POST http://localhost:3001/icps/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/user"}' | jq
```

## Phase 5: LinkedIn scraping (best-effort public data)
- [x] Implement lightweight scraper using cheerio to parse public LinkedIn profile HTML
- [x] Wire scraper into resolver to enrich name/headline/location when available
- [ ] Add README/API docs describing scrape behavior, limits, and expected fields
- [ ] Add sample success/failure responses for LinkedIn scrape

---

## Data Enrichment (Waterfall) – Production Plan

### Overview
- Goal: cost-aware waterfall enrichment for company/person inputs with free → cheap → paid steps; ContactOut only for people-contact gaps.
- Constraints: long-running scrapes happen in background workers; cache prior results to avoid paid lookups.

### Milestones & Status
- [ ] M1: Infra – add Redis + BullMQ worker; POST /enrich creates job and returns jobId; GET /enrich/:jobId returns status/result. (In progress: queue + stub worker wired; needs real pipeline and external Redis running)
- [ ] M2: Schema – zod contracts for request (url, requiredFields, budget) and response (data map, confidence, provenance, cost breakdown).
- [ ] M3: Input router – normalize LinkedIn/company URL; if LinkedIn, resolve company website early for free scrape.
- [ ] M4: Free layer – Firecrawl/Puppeteer website scrape (home/about/contact/team) with parsers for description, HQ, socials, generic emails, leadership names.
- [ ] M5: Cheap layer – Serper/targeted search for revenue, funding, employee count when missing or low confidence.
- [ ] M6: Gap analyzer – confidence scoring + gap list; source ranking (website > search > paid > ai guess).
- [ ] M7: Paid layer – ContactOut client restricted to person lookups (email/phone) for specific people surfaced earlier; enforce per-request budget guardrail.
- [ ] M8: Cache/store – persist enrichments by normalized domain/LinkedIn URL + field set; reuse before paid calls; store provenance + timestamps.
- [ ] M9: Observability – structured logs per stage, cost metrics, audit trail of sources used.
- [ ] M10: Docs/tests – README updates, manual curl steps, worker health check, and stage-by-stage tests/mocks.

### Notes/Risks
- ContactOut is people-only; do not query it for company revenue/size. Treat cost as per-profile, not per-field.
- Long-running scrapes (20–60s) must run in the worker, not in request/response handlers to avoid timeouts.

### Quick test (M1 stub)
- Ensure Redis is running at REDIS_URL (default redis://localhost:6379)
- Start API (worker auto-starts): `bun run src/index.ts`
- REST enqueue: `curl -s -X POST http://localhost:3001/enrich -H 'Content-Type: application/json' -d '{"url":"https://example.com","requiredFields":["employees"],"mock":true}'`
- REST poll: `curl -s http://localhost:3001/enrich/<jobId>`
- tRPC enqueue: `curl -s -X POST http://localhost:3001/trpc/enrich.enqueue -H 'Content-Type: application/json' -d '{"input":{"url":"https://example.com","requiredFields":["employees"],"mock":true}}'`
- tRPC status: `curl -s -X GET 'http://localhost:3001/trpc/enrich.status?input={"jobId":"<jobId>"}'`
# Backend ICP Implementation Plan

## Phase 0: Planning
- [x] Capture requirements and draft phased plan

## Phase 1: Backend scaffolding
- [x] Create folder structure: `src/routes`, `src/services`, `src/types`, `src/utils`
- [x] Move/organize existing app bootstrap into `src/server.ts` and route registration into `src/routes`

## Phase 2: URL validation and parsing
- [x] Implement LinkedIn/GitHub profile URL validator and normalizer (reject others)
- [x] Add lightweight parser to extract username/slug for downstream enrichment

## Phase 3: Minimal ICP endpoint
- [x] Add route `POST /icps/resolve` that accepts `{ url: string }`
- [x] Return structured shape `{ source: 'linkedin'|'github', handle: string, profileUrl: string }`
- [x] Provide placeholder `name` until enrichment is implemented

## Phase 4: Testing and docs
- [x] Add manual test steps (curl examples) and expected responses
- [ ] Update root endpoint listing and README/API docs

### Manual test steps (Phase 4)
From `apps/api` with server running on port 3001:

1) Health
```
curl -s http://localhost:3001/health | jq
```

2) Resolve GitHub profile
```
curl -s -X POST http://localhost:3001/icps/resolve \
	-H 'Content-Type: application/json' \
	-d '{"url": "https://github.com/octocat"}' | jq
```
- Expect source `github`, handle `octocat`, and null `name/headline/location`.

3) Resolve LinkedIn profile
```
curl -s -X POST http://localhost:3001/icps/resolve \
	-H 'Content-Type: application/json' \
	-d '{"url": "https://www.linkedin.com/in/some-handle"}' | jq
```
- Expect source `linkedin`, handle `some-handle`, and best-effort `name/headline` when public OG tags exist.

4) Error case (unsupported host)
```
curl -s -X POST http://localhost:3001/icps/resolve \
	-H 'Content-Type: application/json' \
	-d '{"url": "https://example.com/user"}' | jq
```

## Phase 5: LinkedIn scraping (best-effort public data)
- [x] Implement lightweight scraper using cheerio to parse public LinkedIn profile HTML
- [x] Wire scraper into resolver to enrich name/headline/location when available
- [ ] Add README/API docs describing scrape behavior, limits, and expected fields
- [ ] Add sample success/failure responses for LinkedIn scrape
