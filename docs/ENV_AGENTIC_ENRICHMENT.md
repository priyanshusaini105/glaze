# Agentic Enrichment Environment Variables

This document lists all environment variables required for the agentic enrichment system.

## Required API Keys

### Groq (LLM)
```bash
# Groq API key for LLM synthesis (bio generation, company summaries)
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### Serper.dev (SERP Discovery)
```bash
# Serper API key for Google Search
# Cost: ~$0.01 per search
SERPER_API_KEY=xxxxxxxxxxxxx
```

### RapidAPI (LinkedIn Data)
```bash
# RapidAPI key for LinkedIn Data API
# Cost: ~$0.02-0.05 per call
RAPIDAPI_KEY=xxxxxxxxxxxxx
```

## Optional API Keys

### GitHub (Free but Rate Limited)
```bash
# GitHub token for higher rate limits (optional)
# Without token: 60 requests/hour
# With token: 5000 requests/hour
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

### Email Verification

```bash
# Hunter.io API key (email verification)
# Cost: ~$0.01-0.02 per verification
HUNTER_API_KEY=xxxxxxxxxxxxx

# OR ZeroBounce API key (alternative email verifier)
ZEROBOUNCE_API_KEY=xxxxxxxxxxxxx
```

## Database & Redis

```bash
# PostgreSQL database URL
DATABASE_URL=postgresql://user:password@localhost:5432/glaze

# Redis URL (for caching)
REDIS_URL=redis://localhost:6379
```

## Trigger.dev

```bash
# Trigger.dev secret key
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxx
```

## Example .env.local

```bash
# ============================================================
# GLAZE - Agentic Enrichment Configuration
# ============================================================

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/glaze

# Redis Cache
REDIS_URL=redis://localhost:6379

# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxx

# ============================================================
# ENRICHMENT API KEYS
# ============================================================

# LLM - Groq (Required for synthesis)
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# SERP Discovery - Serper.dev (Required for web search)
SERPER_API_KEY=xxxxxxxxxxxxx

# LinkedIn Data - RapidAPI (Required for LinkedIn enrichment)
RAPIDAPI_KEY=xxxxxxxxxxxxx

# ============================================================
# OPTIONAL API KEYS
# ============================================================

# GitHub - Higher rate limits (optional)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Email Verification - Hunter.io (optional)
HUNTER_API_KEY=xxxxxxxxxxxxx

# Email Verification - ZeroBounce (alternative)
# ZEROBOUNCE_API_KEY=xxxxxxxxxxxxx
```

## Cost Estimates

| Provider | Cost per Call | Notes |
|----------|--------------|-------|
| GitHub | Free | 60 req/hr without token |
| Company Scraper | Free | Uses fetch() |
| Serper.dev | ~$0.01 | Google SERP results |
| LinkedIn API | ~$0.02-0.05 | RapidAPI LinkedIn Data |
| Hunter.io | ~$0.01 | Email verification |
| ZeroBounce | ~$0.008 | Email verification |
| Groq LLM | ~$0.0001 | Token-based pricing |

## Budget Defaults

The system defaults are:
- **Per-row budget**: 100 cents ($1.00)
- **Per-cell limit**: 50 cents ($0.50)
- **Warning threshold**: 80% of budget

These can be configured in `apps/workflows/src/enrichment-config.ts` or passed per-request.
