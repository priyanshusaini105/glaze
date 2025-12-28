export type IcpDataSource = {
  name: string;
  kind:
    | 'public-api'
    | 'scraper'
    | 'official-api'
    | 'free-tier'
    | 'paid-api'
    | 'mid-tier'
    | 'enterprise';
  url?: string;
  cost: 'free' | 'free-tier' | 'low-cost' | 'mid-tier' | 'enterprise';
  notes?: string;
};

export type IcpPhase = {
  id: number;
  name: string;
  objective: string;
  summary: string;
  costRange?: string;
  characteristics: string[];
  exitCriteria: string[];
  dataSources: IcpDataSource[];
};

export type IcpResponse = {
  phases: IcpPhase[];
  mentalModel: string[];
  lastUpdated: string;
};

export const ICP_DATA: IcpResponse = {
  phases: [
    {
      id: 1,
      name: 'Free Public APIs',
      objective: 'Prove the GTM motion works with zero spend.',
      summary: 'Zero-cost firmographic and open data; strict rate limits and noisy signals.',
      costRange: 'Free',
      characteristics: [
        'Strict rate limits and partial coverage',
        'Open data only; no proprietary people lists',
        'Good for early ICP hypotheses and feature prototyping'
      ],
      exitCriteria: [
        'You can consistently identify ICPs and patterns',
        'Volume is capped by rate limits rather than lack of signal'
      ],
      dataSources: [
        {
          name: 'GitHub API',
          kind: 'public-api',
          url: 'https://docs.github.com/en/rest',
          cost: 'free',
          notes: 'Developer and org signals; rate limited.'
        },
        {
          name: 'OpenAlex',
          kind: 'public-api',
          url: 'https://docs.openalex.org',
          cost: 'free',
          notes: 'Scholarly authors and institutions; useful for institution graphs.'
        },
        {
          name: 'Enigma Public API',
          kind: 'public-api',
          url: 'https://developers.enigma.com',
          cost: 'free',
          notes: 'Basic U.S. business firmographics with limits.'
        },
        {
          name: 'Wikipedia API',
          kind: 'public-api',
          url: 'https://www.mediawiki.org/wiki/API:Main_page',
          cost: 'free',
          notes: 'Open encyclopedia data for quick enrichment.'
        },
        {
          name: 'Public APIs Directory',
          kind: 'public-api',
          url: 'https://github.com/public-apis/public-apis',
          cost: 'free',
          notes: 'Curated list to discover additional open datasets.'
        }
      ]
    },
    {
      id: 2,
      name: 'Manual + Assisted Scraping',
      objective: 'Expand coverage without spend; combine manual discovery with light automation.',
      summary: 'Scraping and HTML parsing of public pages; brittle but free.',
      costRange: 'Time cost only',
      characteristics: [
        'Time expensive; needs human validation',
        'Brittle selectors and changing layouts',
        'Avoid auth bypass; respect robots and ToS'
      ],
      exitCriteria: [
        'Manual effort is the bottleneck, not data availability',
        'Quality validated on a small sample'
      ],
      dataSources: [
        {
          name: 'Open-source LinkedIn scraper libraries',
          kind: 'scraper',
          url: 'https://github.com/search?q=linkedin+scraper',
          cost: 'free',
          notes: 'Community tools; public-profile only; ensure legal/ToS compliance.'
        },
        {
          name: 'ScrapingDog Profile Scraper API',
          kind: 'scraper',
          url: 'https://www.scrapingdog.com/linkedin-profile-scraper',
          cost: 'free-tier',
          notes: 'Profile/company scraping with hosted proxies; lightweight quotas.'
        }
      ]
    },
    {
      id: 3,
      name: 'Free APIs with Hard Limits',
      objective: 'Replace manual steps with rate-limited automation.',
      summary: 'Official or semi-official APIs with small quotas; forces batching and caching.',
      costRange: 'Free tiers',
      characteristics: [
        'Rate limits per minute/day',
        'Partial enrichment; requires deduping and retries',
        'Good for proving automated pipelines'
      ],
      exitCriteria: [
        'Rate ceilings are reached while demand grows',
        'Pipelines handle caching, dedupe, and retries'
      ],
      dataSources: [
        {
          name: 'LinkedIn Official API (free tier)',
          kind: 'official-api',
          url: 'https://learn.microsoft.com/linkedin/',
          cost: 'free-tier',
          notes: 'Restricted scopes; requires approved app and auth.'
        },
        {
          name: 'People Data Labs (free)',
          kind: 'free-tier',
          url: 'https://docs.peopledatalabs.com/',
          cost: 'free-tier',
          notes: 'Limited enrichment/search credits.'
        },
        {
          name: 'Apollo.io (free/starter)',
          kind: 'free-tier',
          url: 'https://developer.apollo.io/',
          cost: 'free-tier',
          notes: 'Starter contact search with quotas.'
        },
        {
          name: 'LinkdAPI (trial)',
          kind: 'free-tier',
          url: 'https://linkdapi.com',
          cost: 'free-tier',
          notes: 'Professional data enrichment with trial limits.'
        }
      ]
    },
    {
      id: 4,
      name: 'Cheap Paid APIs',
      objective: 'Buy back time and reduce friction once loop is validated.',
      summary: 'Low-cost plans with higher limits and better quality than free tiers.',
      costRange: '$10–$50 per month typical',
      characteristics: [
        'Usage-based pricing; higher rate limits',
        'Some noise remains; coverage improves',
        'Great for proving ROI before heavier spend'
      ],
      exitCriteria: [
        'GTM loop works and needs more scale/speed',
        'Spend is justified by time saved'
      ],
      dataSources: [
        {
          name: 'Apollo.io (paid)',
          kind: 'paid-api',
          url: 'https://developer.apollo.io/',
          cost: 'low-cost',
          notes: 'Contact + company enrichment with outreach tooling.'
        },
        {
          name: 'Lusha',
          kind: 'paid-api',
          url: 'https://www.lusha.com/api/',
          cost: 'low-cost',
          notes: 'Person/company data with email/phone credits.'
        },
        {
          name: 'People Data Labs (paid)',
          kind: 'paid-api',
          url: 'https://docs.peopledatalabs.com/',
          cost: 'low-cost',
          notes: 'Larger quota plus advanced filters.'
        }
      ]
    },
    {
      id: 5,
      name: 'Mid-Tier Data APIs',
      objective: 'Stabilize GTM operations with cleaner, richer data.',
      summary: 'More reliable enrichment and deeper signals; still below enterprise pricing.',
      costRange: '$100–$300 per month typical',
      characteristics: [
        'Consistent people and firmographic coverage',
        'Role history, tech tags, and cleaner enrichment',
        'Fewer retries and less noise'
      ],
      exitCriteria: [
        'Conversion metrics justify recurring spend',
        'GTM process is repeatable and measurable'
      ],
      dataSources: [
        {
          name: 'Clearbit API',
          kind: 'mid-tier',
          url: 'https://dashboard.clearbit.com/docs',
          cost: 'mid-tier',
          notes: 'Firmographic + contact enrichment with solid uptime.'
        },
        {
          name: 'Coresignal API',
          kind: 'mid-tier',
          url: 'https://coresignal.com',
          cost: 'mid-tier',
          notes: 'Company and employee profiles aggregated from multiple sources.'
        }
      ]
    },
    {
      id: 6,
      name: 'Enterprise Data APIs',
      objective: 'Optimize and scale revenue with SLA-backed data.',
      summary: 'High-coverage, high-accuracy datasets with enterprise contracts.',
      costRange: '$1k+ per month; often annual contracts',
      characteristics: [
        'Deep coverage and intent signals',
        'SLA-backed reliability; minimal engineering pain',
        'Custom pricing and sales involvement'
      ],
      exitCriteria: [
        'Revenue attribution justifies premium data',
        'Scaling pipeline, not searching for PMF'
      ],
      dataSources: [
        {
          name: 'ZoomInfo API',
          kind: 'enterprise',
          url: 'https://www.zoominfo.com/business/contact-api',
          cost: 'enterprise',
          notes: 'Large B2B contact database with intent signals.'
        },
        {
          name: 'Dun & Bradstreet API',
          kind: 'enterprise',
          url: 'https://developer.dnb.com',
          cost: 'enterprise',
          notes: 'Authoritative business firmographics and risk data.'
        }
      ]
    }
  ],
  mentalModel: [
    'Free data teaches what matters.',
    'Cheap data teaches how to scale.',
    'Expensive data teaches how to optimize.'
  ],
  lastUpdated: '2025-12-28'
};
