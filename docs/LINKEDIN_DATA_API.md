# LinkedIn Data API Integration Guide

> RapidAPI LinkedIn Data API Documentation for Internal Use

## Table of Contents
1. [Quick Start](#quick-start)
2. [API Keys & Authentication](#api-keys--authentication)
3. [Available Endpoints](#available-endpoints)
4. [Implementation Examples](#implementation-examples)
5. [Testing & Debugging](#testing--debugging)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### API Details
- **Base URL**: `https://linkedin-data-api.p.rapidapi.com`
- **API Host**: `linkedin-data-api.p.rapidapi.com`
- **Provider**: RockAPIs
- **Starting Plan**: Basic ($0.10/month for 100 requests)

### External Resources
- [API Main Page](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api)
- [Endpoints Documentation](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api) (Click Endpoints tab)
- [Pricing Details](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api/pricing)
- [Tutorials](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api) (Click Tutorials tab)

---

## API Keys & Authentication

### Getting Your API Keys

1. **Create RapidAPI Account**
   - Visit [RapidAPI Hub](https://rapidapi.com)
   - Sign up using email, Google, Facebook, or GitHub

2. **Subscribe to LinkedIn Data API**
   - Navigate to [LinkedIn Data API page](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api)
   - Click "Pricing" tab
   - Select Basic plan ($0.10/month)
   - Click "Subscribe"

3. **Retrieve API Key**
   - Go to RapidAPI Dashboard
   - Select "My Apps" from left sidebar
   - Click your application
   - Copy the **X-RapidAPI-Key** value

### Required Headers for All Requests

```
x-rapidapi-key: [YOUR_API_KEY]
x-rapidapi-host: linkedin-data-api.p.rapidapi.com
```

---

## Available Endpoints

### 1. User Profile Endpoint
**GET** `/get-profile-data-by-url`

**Purpose**: Retrieve comprehensive LinkedIn profile data

**Parameters**:
- `url` (required): LinkedIn profile URL (e.g., `https://www.linkedin.com/in/username`)

**Returns**:
- `full_name`: User's name
- `headline`: Professional headline
- `location`: Country and city
- `experience`: Array of work experiences
- `skills`: List of skills
- `education`: Educational background
- `recommendations`: Endorsements received
- `last_activity_date`: Last profile update

**Rate Limit**: Check RapidAPI Dashboard

---

### 2. Company Data Endpoint
**GET** `/get-company-data`

**Purpose**: Retrieve LinkedIn company information

**Parameters**:
- `url` (required): Company LinkedIn URL (e.g., `https://www.linkedin.com/company/company-name`)

**Returns**:
- `company_name`: Company name
- `about`: Company description
- `employee_count`: Total employees
- `industry`: Industry classification
- `location`: Headquarters location
- `website`: Company website
- `founded_year`: Year founded

---

### 3. Search People Endpoint
**GET** `/search-people`

**Purpose**: Search for LinkedIn profiles

**Parameters**:
- `keywords`: Name, location, or company to search
- Other filters based on endpoint documentation

---

### 4. Job Search Endpoint
**GET** `/search-jobs`

**Purpose**: Search LinkedIn job postings

**Parameters**:
- `keywords`: Job title or keywords
- `location`: Job location
- `company`: Specific company filter

---

## Implementation Examples

### Node.js/TypeScript

#### 1. Setup

**Install dependencies**:
```bash
npm install axios dotenv
# or
bun add axios dotenv
```

**Create `.env` file**:
```
RAPIDAPI_KEY=your_api_key_here
```

**Create `config.ts`**:
```typescript
export const config = {
  rapidApiKey: process.env.RAPIDAPI_KEY || '',
  rapidApiHost: 'linkedin-data-api.p.rapidapi.com'
};
```

#### 2. Get User Profile

```typescript
import axios from 'axios';
import { config } from './config';

interface LinkedInProfile {
  full_name: string;
  headline: string;
  location: {
    country: string;
    city: string;
  };
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  skills: string[];
  education: any[];
}

async function getLinkedInProfile(profileUrl: string): Promise<LinkedInProfile> {
  const options = {
    method: 'GET',
    url: `https://${config.rapidApiHost}/get-profile-data-by-url`,
    params: { url: profileUrl },
    headers: {
      'x-rapidapi-key': config.rapidApiKey,
      'x-rapidapi-host': config.rapidApiHost
    }
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.status, error.response?.data);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
    throw error;
  }
}

// Usage
getLinkedInProfile('https://www.linkedin.com/in/username')
  .then(profile => console.log(profile))
  .catch(error => console.error(error));
```

#### 3. Get Company Data

```typescript
async function getLinkedInCompany(companyUrl: string) {
  const options = {
    method: 'GET',
    url: `https://${config.rapidApiHost}/get-company-data`,
    params: { url: companyUrl },
    headers: {
      'x-rapidapi-key': config.rapidApiKey,
      'x-rapidapi-host': config.rapidApiHost
    }
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Company API Error:', error);
    throw error;
  }
}

// Usage
getLinkedInCompany('https://www.linkedin.com/company/company-name')
  .then(company => console.log(company))
  .catch(error => console.error(error));
```

#### 4. Error Handling Wrapper

```typescript
async function safeApiCall(profileUrl: string) {
  try {
    const response = await getLinkedInProfile(profileUrl);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      
      switch(status) {
        case 401:
          console.error('Invalid API key');
          break;
        case 429:
          console.error('Rate limit exceeded');
          break;
        case 404:
          console.error('Profile not found');
          break;
        default:
          console.error('API Error:', error.message);
      }
    }
    return null;
  }
}
```

---

### Python Implementation

#### 1. Setup

```bash
pip install requests python-dotenv
```

**Create `.env` file**:
```
RAPIDAPI_KEY=your_api_key_here
```

#### 2. Get User Profile

```python
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def get_linkedin_profile(profile_url: str) -> dict:
    """Fetch LinkedIn profile data"""
    url = "https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url"
    
    querystring = {"url": profile_url}
    
    headers = {
        "x-rapidapi-key": os.getenv('RAPIDAPI_KEY'),
        "x-rapidapi-host": "linkedin-data-api.p.rapidapi.com"
    }
    
    try:
        response = requests.get(url, headers=headers, params=querystring)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as err:
        print(f"HTTP Error: {err}")
        raise
    except requests.exceptions.RequestException as err:
        print(f"Request Error: {err}")
        raise

# Usage
if __name__ == "__main__":
    profile_data = get_linkedin_profile("https://www.linkedin.com/in/username")
    print(profile_data)
```

#### 3. Get Company Data

```python
def get_linkedin_company(company_url: str) -> dict:
    """Fetch LinkedIn company data"""
    url = "https://linkedin-data-api.p.rapidapi.com/get-company-data"
    
    querystring = {"url": company_url}
    
    headers = {
        "x-rapidapi-key": os.getenv('RAPIDAPI_KEY'),
        "x-rapidapi-host": "linkedin-data-api.p.rapidapi.com"
    }
    
    response = requests.get(url, headers=headers, params=querystring)
    response.raise_for_status()
    return response.json()

# Usage
company_data = get_linkedin_company("https://www.linkedin.com/company/company-name")
print(company_data)
```

---

### cURL (Terminal)

#### Get User Profile

```bash
curl --request GET \
  --url 'https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url?url=https://www.linkedin.com/in/username' \
  --header 'x-rapidapi-host: linkedin-data-api.p.rapidapi.com' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

#### Get Company Data

```bash
curl --request GET \
  --url 'https://linkedin-data-api.p.rapidapi.com/get-company-data?url=https://www.linkedin.com/company/company-name' \
  --header 'x-rapidapi-host: linkedin-data-api.p.rapidapi.com' \
  --header 'x-rapidapi-key: YOUR_API_KEY_HERE'
```

---

## Testing & Debugging

### Using RapidAPI Playground

1. Navigate to [LinkedIn Data API](https://rapidapi.com/rockapis-rockapis-default/api/linkedin-data-api)
2. Click "Endpoints" tab
3. Select an endpoint (e.g., "get-profile-data-by-url")
4. Fill in required parameters:
   - For profile: `url = https://www.linkedin.com/in/username`
   - Your API key is auto-filled in headers
5. Click "Test Endpoint" button
6. View response in JSON format below

### Debugging Checklist

- [ ] API Key is correct and valid
- [ ] API Host header is exactly: `linkedin-data-api.p.rapidapi.com`
- [ ] LinkedIn URL format is valid and public
- [ ] Rate limit not exceeded
- [ ] Environment variables are loaded correctly
- [ ] Network request is using HTTPS

---

## Best Practices

### 1. Secure API Key Management

❌ **WRONG**:
```typescript
const apiKey = 'abc123def456'; // Never hardcode
```

✅ **CORRECT**:
```typescript
const apiKey = process.env.RAPIDAPI_KEY;
```

**Create `.gitignore`**:
```
.env
.env.local
.env.*.local
config.js
```

### 2. Monitoring & Usage

- Check RapidAPI Dashboard regularly
- Track API calls to avoid exceeding rate limits
- Monitor monthly quota usage
- Set alerts for high usage

### 3. Error Handling

Always wrap API calls with try-catch blocks:

```typescript
async function safeLinkedInCall(url: string) {
  try {
    return await getLinkedInProfile(url);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      switch(status) {
        case 401: // Unauthorized
          console.error('Invalid or expired API key');
          break;
        case 429: // Too Many Requests
          console.error('Rate limit exceeded - wait before retrying');
          break;
        case 404: // Not Found
          console.error('Profile or company not found');
          break;
        case 500: // Server Error
          console.error('API server error - retry later');
          break;
      }
    }
    return null;
  }
}
```

### 4. Rate Limiting Strategy

```typescript
import pLimit from 'p-limit';

// Limit to 5 concurrent requests
const limit = pLimit(5);

const profiles = [
  'https://www.linkedin.com/in/user1',
  'https://www.linkedin.com/in/user2',
  // ... more URLs
];

const results = await Promise.all(
  profiles.map(url => limit(() => getLinkedInProfile(url)))
);
```

### 5. Caching Results

```typescript
const profileCache = new Map<string, LinkedInProfile>();

async function getCachedProfile(url: string): Promise<LinkedInProfile> {
  if (profileCache.has(url)) {
    return profileCache.get(url)!;
  }

  const profile = await getLinkedInProfile(url);
  profileCache.set(url, profile);
  return profile;
}
```

### 6. Test Before Production

- Always test endpoints in RapidAPI playground first
- Test with sample URLs before going live
- Verify response structure matches expectations
- Test error scenarios (invalid URLs, non-existent profiles)

---

## Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API key | Verify key in RapidAPI Dashboard under "My Apps" |
| 429 Rate Limited | Too many requests | Implement request throttling or upgrade plan |
| 404 Not Found | Profile/company doesn't exist | Verify URL is correct and profile is public |
| 500 Server Error | API server issue | Retry after a few seconds |
| CORS Error | Browser-based request | Make requests from backend/server only |
| Empty Response | Profile is private | LinkedIn profile must be public |

### Checking API Status

1. Visit [RapidAPI Status](https://rapidapi.com/status)
2. Check LinkedIn Data API status
3. View any ongoing incidents

### Getting Help

1. Check RapidAPI Documentation
2. Review API Tutorials tab
3. Contact RapidAPI Support through Dashboard
4. Check console logs for detailed error messages

---

## Cost & Quotas

### Pricing Tiers

| Plan | Cost | Requests/Month | Use Case |
|------|------|----------------|----------|
| Basic | $0.10 | 100 | Testing & development |
| Pro | $10 | 10,000 | Small projects |
| Enterprise | Custom | Unlimited | Production apps |

### Monitoring Usage

1. Go to RapidAPI Dashboard
2. Select "My Apps"
3. Click your application
4. View "Usage" section
5. Set monthly quota alerts

### Resetting Compromised Key

1. Go to RapidAPI Dashboard
2. Select "My Apps"
3. Click pencil icon for application
4. Click "Delete" button
5. Create new application for fresh key

---

## Quick Reference Checklist

- [ ] RapidAPI Account Created
- [ ] LinkedIn Data API Subscribed
- [ ] API Key Copied and Stored in `.env`
- [ ] `.env` Added to `.gitignore`
- [ ] Dependencies Installed (`axios`, `dotenv`)
- [ ] Configuration File Created
- [ ] Sample Request Tested in Playground
- [ ] Code Implementation Complete
- [ ] Error Handling Added
- [ ] Rate Limiting Implemented
- [ ] Testing Done in Development
- [ ] Ready for Production

---

## Related Documentation

- [ENRICHMENT_UNIFIED_API.md](./ENRICHMENT_UNIFIED_API.md) - If integrating with enrichment services

---

**Last Updated**: January 2026  
**Status**: Active  
**Tested With**: Node.js 18+, TypeScript 5+, Python 3.8+
