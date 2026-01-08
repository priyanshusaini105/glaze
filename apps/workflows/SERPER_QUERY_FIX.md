# Fixed: Removed Exact Match Quotes from Serper Queries

## Problem
All Serper search queries were using double quotes (`"`) around names and companies, which forced **exact phrase matching** in Google Search. This was too strict and caused zero results for:
- Name variations (e.g., "Ankit Varsney" vs "Ankit Varshney")
- Company name variations (e.g., "Freckle.io" vs just "Freckle")
- Any spelling differences or formatting inconsistencies

## Solution
Removed all double quotes from search queries across the codebase, allowing Google's fuzzy matching algorithm to find relevant results even with slight variations.

## Files Changed

### 1. `find-linkedin-profile.ts`
**Before:**
```typescript
const query = `"${name}" "${company}" site:linkedin.com/in`;
const altQuery = `"${name}" "${company}" LinkedIn`;
```

**After:**
```typescript
const query = `${name} ${company} site:linkedin.com/in`;
const altQuery = `${name} ${company} LinkedIn`;
```

### 2. `serper-provider.ts`
**Before:**
```typescript
query = `"${input.name}" "${input.company}" LinkedIn`;
query = `"${input.name}" LinkedIn`;
query = `"${namePart}" LinkedIn`;
```

**After:**
```typescript
query = `${input.name} ${input.company} LinkedIn`;
query = `${input.name} LinkedIn`;
query = `${namePart} LinkedIn`;
```

### 3. `generic-web-search.ts`
**Before:**
```typescript
if (name) {
    parts.push(`"${name}"`);
}
if (company && company !== name) {
    parts.push(`"${company}"`);
}
```

**After:**
```typescript
if (name) {
    parts.push(name);
}
if (company && company !== name) {
    parts.push(company);
}
```

### 4. `smart-enrichment-provider.ts`
**Before:**
```typescript
const query = `"${companyName}" company industry`;
const query = `"${companyName}" company about`;
const query = `"${companyName}" official company`;
```

**After:**
```typescript
const query = `${companyName} company industry`;
const query = `${companyName} company about`;
const query = `${companyName} official company`;
```

## Impact

### Search Behavior Change
- **Before:** `"Ankit Varsney" "Freckle.io" site:linkedin.com/in` → Requires EXACT match
- **After:** `Ankit Varsney Freckle.io site:linkedin.com/in` → Google fuzzy matches

### Expected Results
✅ **Better recall** - More results will be found  
✅ **Handles typos** - "Varsney" vs "Varshney"  
✅ **Name variations** - "Freckle.io" vs "Freckle"  
✅ **Company aliases** - "International Business Machines" vs "IBM"  
⚠️ **Slightly lower precision** - May occasionally match wrong people (but LLM scoring filters this)

## Testing Recommendations

Test with edge cases:
1. **Name variations**: "Jon Smith" vs "Jonathan Smith"
2. **Spelling differences**: "Ankit Varsney" vs "Ankit Varshney"  
3. **Company formats**: "Freckle.io" vs "Freckle"
4. **Common names**: "John Smith" (high ambiguity - should still work with LLM scoring)

## Notes

- The LLM selection step (in `find-linkedin-profile.ts`) still validates results, so we maintain quality despite broader search
- Confidence scoring accounts for match quality
- This change aligns with Google's recommendation to avoid overusing exact match operators
