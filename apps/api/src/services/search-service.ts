import { EnrichmentData, EnrichedValue, EnrichmentField } from '../types/enrichment';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const SERPER_BASE_URL = 'https://google.serper.dev/search';
const COST_PER_SEARCH_CENTS = 1; // Approx $0.01 per search

export type SearchResult = {
  title: string;
  link: string;
  snippet: string;
  position: number;
};

export type SerperSearchResponse = {
  organic: SearchResult[];
  answerBox?: {
    title?: string;
    answer?: string;
    snippet?: string;
  };
  knowledgeGraph?: {
    title?: string;
    type?: string;
    description?: string;
    attributes?: Record<string, string>;
  };
};

export type SearchEnrichmentResult = {
  data: Partial<EnrichmentData>;
  searchesPerformed: number;
  costCents: number;
  errors: string[];
};

const createEnrichedValue = (value: string | number | null, confidence = 70): EnrichedValue => ({
  value,
  confidence,
  source: 'search_result',
  timestamp: new Date().toISOString()
});

const performSearch = async (query: string): Promise<SerperSearchResponse | null> => {
  if (!SERPER_API_KEY) {
    console.warn('[search-service] SERPER_API_KEY not configured');
    return null;
  }

  try {
    const res = await fetch(SERPER_BASE_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: 10
      })
    });

    if (!res.ok) {
      console.error(`[search-service] Serper API error: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[search-service] Search failed:', err);
    return null;
  }
};

// Parse employee count from search results
const parseEmployeeCount = (text: string): number | null => {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*)\s*(?:\+\s*)?employees?/i,
    /(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)\s*employees?/i,
    /(?:has|with|employs?)\s*(\d{1,3}(?:,\d{3})*)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // For ranges, take the midpoint
      if (match[2]) {
        const low = parseInt(match[1].replace(/,/g, ''), 10);
        const high = parseInt(match[2].replace(/,/g, ''), 10);
        return Math.round((low + high) / 2);
      }
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }

  return null;
};

// Parse revenue from search results
const parseRevenue = (text: string): string | null => {
  const patterns = [
    /\$(\d+(?:\.\d+)?)\s*(?:billion|B)/i,
    /\$(\d+(?:\.\d+)?)\s*(?:million|M)/i,
    /revenue[:\s]+\$?(\d+(?:\.\d+)?)\s*(?:billion|million|B|M)?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
};

// Parse funding from search results
const parseFunding = (text: string): string | null => {
  const patterns = [
    /(?:raised|funding[:\s]+)\$?(\d+(?:\.\d+)?)\s*(?:billion|million|B|M)/i,
    /\$(\d+(?:\.\d+)?)\s*(?:billion|million|B|M)\s*(?:funding|raised|round)/i,
    /series\s*[A-Z]\s*(?:of\s*)?\$?(\d+(?:\.\d+)?)\s*(?:billion|million|B|M)?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
};

// Parse founded year
const parseFoundedYear = (text: string): number | null => {
  const patterns = [
    /founded\s*(?:in\s*)?(\d{4})/i,
    /established\s*(?:in\s*)?(\d{4})/i,
    /since\s+(\d{4})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 1800 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  }

  return null;
};

// Parse industry from search results
const parseIndustry = (text: string): string | null => {
  const industries = [
    'software', 'technology', 'healthcare', 'finance', 'fintech',
    'e-commerce', 'retail', 'manufacturing', 'consulting', 'marketing',
    'education', 'real estate', 'logistics', 'transportation', 'media',
    'entertainment', 'telecommunications', 'energy', 'agriculture', 'biotechnology',
    'cybersecurity', 'artificial intelligence', 'machine learning', 'saas', 'b2b', 'b2c'
  ];

  const lowerText = text.toLowerCase();
  for (const industry of industries) {
    if (lowerText.includes(industry)) {
      return industry.charAt(0).toUpperCase() + industry.slice(1);
    }
  }

  return null;
};

export const searchForCompanyData = async (
  companyName: string,
  domain: string | null,
  requiredFields: EnrichmentField[]
): Promise<SearchEnrichmentResult> => {
  const result: SearchEnrichmentResult = {
    data: {},
    searchesPerformed: 0,
    costCents: 0,
    errors: []
  };

  if (!SERPER_API_KEY) {
    result.errors.push('Serper API key not configured');
    return result;
  }

  const searchIdentifier = domain || companyName;

  // Build targeted search queries based on required fields
  const searchQueries: { query: string; targetFields: EnrichmentField[] }[] = [];

  if (requiredFields.some((f) => ['company_employee_count', 'company_revenue', 'company_industry'].includes(f))) {
    searchQueries.push({
      query: `"${searchIdentifier}" company employees revenue`,
      targetFields: ['company_employee_count', 'company_revenue', 'company_industry']
    });
  }

  if (requiredFields.includes('company_funding')) {
    searchQueries.push({
      query: `"${searchIdentifier}" funding raised series`,
      targetFields: ['company_funding']
    });
  }

  if (requiredFields.includes('company_founded_year')) {
    searchQueries.push({
      query: `"${searchIdentifier}" founded established year`,
      targetFields: ['company_founded_year']
    });
  }

  // Execute searches
  for (const { query, targetFields } of searchQueries) {
    // Skip if we already have all target fields
    if (targetFields.every((f) => result.data[f])) continue;

    const searchResult = await performSearch(query);
    result.searchesPerformed++;
    result.costCents += COST_PER_SEARCH_CENTS;

    if (!searchResult) {
      result.errors.push(`Search failed for: ${query}`);
      continue;
    }

    // Combine all text from results
    const allText = [
      searchResult.answerBox?.answer,
      searchResult.answerBox?.snippet,
      searchResult.knowledgeGraph?.description,
      ...Object.values(searchResult.knowledgeGraph?.attributes || {}),
      ...searchResult.organic.slice(0, 5).map((r) => `${r.title} ${r.snippet}`)
    ]
      .filter(Boolean)
      .join(' ');

    // Parse employee count
    if (targetFields.includes('company_employee_count') && !result.data.company_employee_count) {
      const count = parseEmployeeCount(allText);
      if (count) {
        result.data.company_employee_count = createEnrichedValue(count, 65);
      }
    }

    // Parse revenue
    if (targetFields.includes('company_revenue') && !result.data.company_revenue) {
      const revenue = parseRevenue(allText);
      if (revenue) {
        result.data.company_revenue = createEnrichedValue(revenue, 60);
      }
    }

    // Parse industry
    if (targetFields.includes('company_industry') && !result.data.company_industry) {
      const industry = parseIndustry(allText);
      if (industry) {
        result.data.company_industry = createEnrichedValue(industry, 65);
      }
    }

    // Parse funding
    if (targetFields.includes('company_funding') && !result.data.company_funding) {
      const funding = parseFunding(allText);
      if (funding) {
        result.data.company_funding = createEnrichedValue(funding, 60);
      }
    }

    // Parse founded year
    if (targetFields.includes('company_founded_year') && !result.data.company_founded_year) {
      const year = parseFoundedYear(allText);
      if (year) {
        result.data.company_founded_year = createEnrichedValue(year, 70);
      }
    }
  }

  return result;
};

export const isSearchServiceConfigured = (): boolean => {
  return Boolean(SERPER_API_KEY);
};
