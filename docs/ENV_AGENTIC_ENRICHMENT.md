# Agentic Enrichment Environment Variables

This document lists all environment variables for the enrichment system, organized by cost tier.

## API Cost Tiers

| Rating | Description | Examples |
|--------|-------------|----------|
| **0x** | Completely free/unlimited | GitHub, Wikipedia, SMTP |
| **0.5x** | Very generous free tier | Groq, OpenCorporates |
| **1x** | Good free tier | Serper (2500/mo) |
| **1.5x** | Moderate free tier | Prospeo (75/mo) |
| **2x** | Limited free tier | Hunter (50/mo) |
| **3x** | No free plan | Firecrawl, LinkedIn API |

---

## FREE APIs (0x - No API key needed)

### GitHub API
```bash
# Optional: Provides 5000 req/hr instead of 60 req/hr
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

### Wikipedia/Wikidata
No API key needed - completely free and unlimited.

### OpenCorporates
No API key needed for basic usage - generous rate limits.

---

## RECOMMENDED APIs (0.5x - 1x cost)

### Groq (LLM - 0.5x)
```bash
# AI inference for data processing and synthesis
# Very generous free tier
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### Serper.dev (SERP - 1x)
```bash
# Google Search API
# 2,500 searches/month free
SERPER_API_KEY=xxxxxxxxxxxxx
```

---

## OPTIONAL APIs (1.5x - 2x cost)

### Prospeo (Email - 1.5x)
```bash
# Email finding - 75 credits/month free
# Better free tier than Hunter
PROSPEO_API_KEY=xxxxxxxxxxxxx
```

### Hunter.io (Email - 2x)
```bash
# Email finding - 50 credits/month free
HUNTER_API_KEY=xxxxxxxxxxxxx
```

### ZeroBounce (Email Verification)
```bash
# Alternative email verifier
ZEROBOUNCE_API_KEY=xxxxxxxxxxxxx
```

---

## PREMIUM APIs (3x cost - Use Sparingly)

### RapidAPI LinkedIn (3x)
```bash
# LinkedIn Data API - paid only
# ~$0.02-0.05 per call
RAPIDAPI_KEY=xxxxxxxxxxxxx
```

---

## Infrastructure

```bash
# PostgreSQL database URL
DATABASE_URL=postgresql://user:password@localhost:5432/glaze

# Redis URL (for caching)
REDIS_URL=redis://localhost:6379

# Trigger.dev secret key
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxx
```

---

## Recommended Minimal Setup (.env.local)

For testing with maximum free tier usage:

```bash
# ============================================================
# GLAZE - Cost-Effective Enrichment Setup
# ============================================================

# Database & Cache
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/glaze
REDIS_URL=redis://localhost:6379

# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxx

# ============================================================
# FREE APIs (0x cost)
# ============================================================

# GitHub - Optional, but gives 5000 req/hr vs 60 req/hr
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# ============================================================
# CHEAP APIs (0.5x - 1x cost)
# ============================================================

# Groq LLM - For AI synthesis (very generous free tier)
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# Serper - For SERP searches (2500/month free)
SERPER_API_KEY=xxxxxxxxxxxxx

# ============================================================
# OPTIONAL APIs (use if you have credits)
# ============================================================

# Prospeo - Email finding (75/month free)
# PROSPEO_API_KEY=xxxxxxxxxxxxx

# Hunter - Email finding (50/month free)
# HUNTER_API_KEY=xxxxxxxxxxxxx
```

---

## Provider Priority by Cost

The system uses providers in this order:

1. **Free (0x)**: GitHub, Wikipedia, OpenCorporates, Company Scraper
2. **Cheap (1x)**: Serper, Prospeo, Email Pattern Inference
3. **Premium (3x)**: LinkedIn API (only if `usePremium: true`)
