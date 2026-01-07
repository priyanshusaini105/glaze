# Enrichment Logging Quick Reference

## Log Symbols Cheat Sheet

| Symbol | Meaning | Level |
|--------|---------|-------|
| 🔧 | Service initialized | info |
| 🏷️ | Classification done | info |
| 💾 | Cache operation | debug/info |
| ♻️ | Cache hit | info |
| 🚀 | Provider spawned | info |
| 🔍 | Searching | info |
| ⏳ | Fetching from provider | debug |
| ✅ | Success | info |
| ⚠️ | Warning/Issue | warn |
| ❌ | Failure | warn |
| 💎 | Premium provider | info |
| 🔮 | Ensemble fusion | debug |
| 📊 | Summary | info |
| 📈 | Parallel probes results | info |
| 🔄 | Singleflight/coalescing | debug |
| ↗️ | Moving to next stage | info |
| 💰 | Budget exceeded | debug |
| ⏭️ | Skipping provider | debug |

## One-Line Log Patterns to Search

### Find successful enrichments
```bash
grep "✨ Enrichment succeeded" logs.txt
```

### Find failures
```bash
grep "❌ Cell enrichment v2 failed" logs.txt
```

### Find a specific row
```bash
grep "367c9eb5-763a-4be1-b84e-e104c3cdfcad" logs.txt
```

### Find expensive enrichments (> 5¢)
```bash
grep "costCents" logs.txt | grep -E "\"(5|6|7|8|9|10)\"" 
```

### Find slow enrichments (> 1 second)
```bash
grep "latencyMs" logs.txt | grep -E "[1-9][0-9]{3,}"
```

### Find cache hits
```bash
grep "cache HIT" logs.txt
```

### Find which providers failed
```bash
grep "❌ Probe failed" logs.txt
```

## Quick Debugging Steps

### "No provider could enrich website"

1. Look for `Cache MISS`:
   - If not there → issue is in cache system

2. Look for `Running N parallel probes`:
   - If 0 → no providers available
   - If > 0 → providers were tried

3. Look for `Probe result:`:
   - If none → all probes failed
   - If exists but confidence low → threshold issue

4. Look for `Premium fallback triggered`:
   - If not there → premium wasn't tried
   - If yes → check premium provider logs

5. Look for `❌ Enrichment failed for`:
   - Final note shows reason
   - Check this for specific error

### High Cost Enrichment

1. Find the enrichment in logs
2. Look for `costCents: X` entries
3. Check which provider was used (highest cost?)
4. If premium: check if parallel probes had results
5. If free tier expensive: check if using mock providers

### Slow Enrichment

1. Find the enrichment in logs
2. Look for `latencyMs: X` for each probe
3. Check which provider is slowest
4. If > 2000ms: network issue or provider overload
5. Check provider health (circuit breaker status)

## Log Analysis Commands

### Count successes vs failures
```bash
# Successes
grep "✨ Enrichment succeeded" logs.txt | wc -l

# Failures
grep "❌ Enrichment failed" logs.txt | wc -l
```

### Average confidence level
```bash
grep "confidence:" logs.txt | \
  sed 's/.*confidence": \([0-9]*\.[0-9]*\).*/\1/' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count}'
```

### Most expensive provider
```bash
grep "costCents:" logs.txt | \
  sed 's/.*"costCents": \([0-9]*\).*/\1/' | \
  sort -rn | head -1
```

### Slowest provider
```bash
grep "latencyMs:" logs.txt | \
  sed 's/.*"latencyMs": \([0-9]*\).*/\1/' | \
  sort -rn | head -1
```

### Cache hit rate
```bash
total=$(grep "Cache MISS\|cache HIT" logs.txt | wc -l)
hits=$(grep "cache HIT" logs.txt | wc -l)
echo "Cache hit rate: $((hits * 100 / total))%"
```

## JSON Log Parsing

### Pretty print a log entry
```bash
grep "367c9eb5-..." logs.txt | jq .
```

### Extract specific field
```bash
grep "confidence:" logs.txt | jq '.confidence'
```

### Filter by field value
```bash
jq 'select(.field == "website")' logs.json
```

### Group by provider
```bash
jq -s 'group_by(.provider) | map({provider: .[0].provider, count: length})' logs.json
```

## Common Issues & Searches

| Issue | Search Pattern |
|-------|---|
| Missing SERPER API key | `"SERPER_API_KEY"` OR `"No SERPER"` |
| Circuit breaker opened | `"Circuit breaker"` OR `"OPEN"` |
| Budget exhausted | `"exceeds budget"` |
| Confidence too low | `"confidence threshold"` |
| Provider timeout | `"timeout"` OR `"error"` |
| Network issue | `"Network error"` OR `"fetch failed"` |
| Invalid input | `"Classification FAIL_FAST"` |
| All providers skipped | `"No providers available"` |

## Monitoring Dashboard Queries

If using Datadog/New Relic/similar:

### Success Rate
```
count(field:✨ Enrichment succeeded) / count(field:enrichment) * 100
```

### Average Cost
```
avg(costCents) filter(field:enrichment succeeded)
```

### P95 Latency
```
percentile(latencyMs, 95) filter(field:enrichment)
```

### Provider Performance
```
group_by(provider) [
  count(),
  avg(confidence),
  avg(costCents),
  avg(latencyMs)
]
```

### Cache Effectiveness
```
count(cache HIT) / count(cache check) * 100
```

## Related Documentation

- 📖 [ENRICHMENT_LOGGING_GUIDE.md](./ENRICHMENT_LOGGING_GUIDE.md) - Full logging guide
- 🔍 [WEBSITE_ENRICHMENT_TROUBLESHOOTING.md](./WEBSITE_ENRICHMENT_TROUBLESHOOTING.md) - Troubleshooting
- 📊 [WEBSITE_ENRICHMENT_ANALYSIS.md](./WEBSITE_ENRICHMENT_ANALYSIS.md) - Architecture
- 📝 [LOGGING_IMPLEMENTATION_SUMMARY.md](./LOGGING_IMPLEMENTATION_SUMMARY.md) - What was added
