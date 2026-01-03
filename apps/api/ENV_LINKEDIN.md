# LinkedIn Data API - Environment Variables

## Required Variables

### RapidAPI Configuration

```bash
# Your RapidAPI key (required)
# Get it from: https://rapidapi.com/developer/security
RAPIDAPI_KEY=your_rapidapi_key_here

# LinkedIn Data API host (optional, has default)
RAPIDAPI_LINKEDIN_HOST=linkedin-data-api.p.rapidapi.com
```

## Setup Instructions

### 1. Get Your RapidAPI Key

1. Visit [RapidAPI Hub](https://rapidapi.com)
2. Sign up or log in
3. Subscribe to [LinkedIn Data API](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api)
4. Go to **Dashboard** → **My Apps**
5. Copy your **X-RapidAPI-Key**

### 2. Add to .env File

Create or update `apps/api/.env`:

```bash
# Add this line with your actual API key
RAPIDAPI_KEY=abc123def456ghi789

# Optional: Override default LinkedIn API host
RAPIDAPI_LINKEDIN_HOST=linkedin-data-api.p.rapidapi.com
```

### 3. Verify Configuration

Run the test script:

```bash
cd apps/api
bun run src/examples/linkedin-api-examples.ts
```

## Environment Variable Details

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RAPIDAPI_KEY` | ✅ Yes | None | Your RapidAPI authentication key |
| `RAPIDAPI_LINKEDIN_HOST` | ❌ No | `linkedin-data-api.p.rapidapi.com` | API host (rarely needs changing) |

## Security Best Practices

### ✅ DO:
- Store API keys in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables in production
- Rotate keys if compromised

### ❌ DON'T:
- Commit API keys to git
- Hardcode keys in source code
- Share keys publicly
- Use the same key across environments

## Troubleshooting

### "RAPIDAPI_KEY environment variable is not set"

**Solution**: Add `RAPIDAPI_KEY=your_key_here` to your `.env` file

### "Invalid API key" (401 error)

**Solutions**:
1. Verify key is correct (no extra spaces)
2. Check subscription is active on RapidAPI
3. Ensure you're subscribed to LinkedIn Data API

### "Rate limit exceeded" (429 error)

**Solutions**:
1. Wait for rate limit to reset
2. Upgrade your RapidAPI plan
3. Implement request throttling in your code

## Testing Without API Key

For development/testing without hitting the API:

```typescript
// Create a mock service layer
import { Layer, Effect } from 'effect';
import { LinkedInAPIService } from './services/effect-linkedin';

const MockLinkedInService = Layer.succeed(LinkedInAPIService, {
  getProfile: () => Effect.succeed({
    full_name: 'Mock User',
    headline: 'Software Engineer',
    // ... mock data
  }),
  // ... other mock methods
});
```

## Related Documentation

- [LinkedIn Data API Documentation](../../docs/LINKEDIN_DATA_API.md)
- [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard)
- [LinkedIn Data API Pricing](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/pricing)
