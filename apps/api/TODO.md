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
