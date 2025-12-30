import { load, CheerioAPI } from 'cheerio';
import { EnrichmentData, EnrichedValue, EnrichmentField } from '../types/enrichment';

const DEFAULT_TIMEOUT_MS = 15000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type WebsiteScrapeResult = {
  data: Partial<EnrichmentData>;
  pagesScraped: string[];
  errors: string[];
};

const fetchWithTimeout = async (url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    if (!res.ok) {
      return null;
    }

    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const createEnrichedValue = (value: string | number | null, confidence = 95): EnrichedValue => ({
  value,
  confidence,
  source: 'website_scrape',
  timestamp: new Date().toISOString()
});

// Extract company name from various sources
const extractCompanyName = ($: CheerioAPI): string | null => {
  // Try meta tags first
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
  if (ogSiteName) return ogSiteName;

  // Try schema.org
  const schemaOrg = $('script[type="application/ld+json"]').text();
  try {
    const data = JSON.parse(schemaOrg);
    if (data.name) return data.name;
    if (data.organization?.name) return data.organization.name;
  } catch {}

  // Try title tag (often has company name)
  const title = $('title').text()?.trim();
  if (title) {
    // Take first part before common separators
    const parts = title.split(/[-|–—·]/);
    if (parts[0]?.trim()) return parts[0].trim();
  }

  return null;
};

// Extract company description
const extractDescription = ($: CheerioAPI): string | null => {
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
  if (ogDescription && ogDescription.length > 20) return ogDescription;

  const metaDescription = $('meta[name="description"]').attr('content')?.trim();
  if (metaDescription && metaDescription.length > 20) return metaDescription;

  // Try schema.org
  const schemaOrg = $('script[type="application/ld+json"]').text();
  try {
    const data = JSON.parse(schemaOrg);
    if (data.description) return data.description;
  } catch {}

  return null;
};

// Extract social links
const extractSocialLinks = ($: CheerioAPI, baseUrl: string) => {
  const links: { linkedin?: string; twitter?: string } = {};

  $('a[href*="linkedin.com"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href?.includes('linkedin.com/company/')) {
      links.linkedin = href;
    }
  });

  $('a[href*="twitter.com"], a[href*="x.com"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      links.twitter = href;
    }
  });

  return links;
};

// Extract email addresses
const extractEmails = ($: CheerioAPI, html: string): string[] => {
  const emails = new Set<string>();

  // From mailto links
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href');
    const email = href?.replace('mailto:', '').split('?')[0]?.trim();
    if (email && email.includes('@')) {
      emails.add(email.toLowerCase());
    }
  });

  // From page content using regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = html.match(emailRegex) || [];
  matches.forEach((email) => {
    // Filter out common false positives
    if (!email.includes('example.com') && !email.includes('your-email')) {
      emails.add(email.toLowerCase());
    }
  });

  return Array.from(emails).slice(0, 5); // Limit to 5 emails
};

// Extract phone numbers
const extractPhones = ($: CheerioAPI, html: string): string[] => {
  const phones = new Set<string>();

  // From tel links
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href');
    const phone = href?.replace('tel:', '').trim();
    if (phone) {
      phones.add(phone);
    }
  });

  // Common phone patterns
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = html.match(phoneRegex) || [];
  matches.slice(0, 3).forEach((phone) => phones.add(phone));

  return Array.from(phones).slice(0, 3);
};

// Extract location/address
const extractLocation = ($: CheerioAPI): string | null => {
  // Try schema.org address
  const schemaOrg = $('script[type="application/ld+json"]').text();
  try {
    const data = JSON.parse(schemaOrg);
    if (data.address) {
      if (typeof data.address === 'string') return data.address;
      const addr = data.address;
      const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry]
        .filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
  } catch {}

  // Look for common address patterns in footer
  const footer = $('footer').text();
  const addressPatterns = [
    /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)[\w\s,]+\d{5}/i,
    /[\w\s]+,\s*[A-Z]{2}\s+\d{5}/i
  ];

  for (const pattern of addressPatterns) {
    const match = footer.match(pattern);
    if (match) return match[0].trim();
  }

  return null;
};

// Scrape about/contact pages for additional info
const scrapePage = async (url: string): Promise<{ html: string; $: CheerioAPI } | null> => {
  const html = await fetchWithTimeout(url);
  if (!html) return null;
  return { html, $: load(html) };
};

const findSubpageUrls = ($: CheerioAPI, baseUrl: string): string[] => {
  const subpages: string[] = [];
  const baseUrlObj = new URL(baseUrl);

  const keywords = ['about', 'contact', 'team', 'company', 'leadership'];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const fullUrl = new URL(href, baseUrl);
      
      // Only same domain
      if (fullUrl.hostname !== baseUrlObj.hostname) return;

      const path = fullUrl.pathname.toLowerCase();
      if (keywords.some((kw) => path.includes(kw))) {
        subpages.push(fullUrl.href);
      }
    } catch {}
  });

  // Dedupe and limit
  return [...new Set(subpages)].slice(0, 4);
};

export const scrapeWebsite = async (
  websiteUrl: string,
  requiredFields: EnrichmentField[]
): Promise<WebsiteScrapeResult> => {
  const result: WebsiteScrapeResult = {
    data: {},
    pagesScraped: [],
    errors: []
  };

  // Normalize URL
  let normalizedUrl = websiteUrl;
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Scrape homepage
  const homepage = await scrapePage(normalizedUrl);
  if (!homepage) {
    result.errors.push(`Failed to fetch ${normalizedUrl}`);
    return result;
  }

  result.pagesScraped.push(normalizedUrl);
  const { html, $ } = homepage;

  // Extract from homepage
  if (requiredFields.includes('company_name')) {
    const name = extractCompanyName($);
    if (name) {
      result.data.company_name = createEnrichedValue(name);
    }
  }

  if (requiredFields.includes('company_description')) {
    const desc = extractDescription($);
    if (desc) {
      result.data.company_description = createEnrichedValue(desc);
    }
  }

  if (requiredFields.includes('company_website')) {
    result.data.company_website = createEnrichedValue(normalizedUrl);
  }

  const socials = extractSocialLinks($, normalizedUrl);
  if (requiredFields.includes('company_linkedin') && socials.linkedin) {
    result.data.company_linkedin = createEnrichedValue(socials.linkedin);
  }
  if (requiredFields.includes('company_twitter') && socials.twitter) {
    result.data.company_twitter = createEnrichedValue(socials.twitter);
  }

  if (requiredFields.includes('company_email')) {
    const emails = extractEmails($, html);
    if (emails.length > 0) {
      result.data.company_email = createEnrichedValue(emails[0]);
    }
  }

  if (requiredFields.includes('company_phone')) {
    const phones = extractPhones($, html);
    if (phones.length > 0) {
      result.data.company_phone = createEnrichedValue(phones[0]);
    }
  }

  if (requiredFields.includes('company_hq_location')) {
    const location = extractLocation($);
    if (location) {
      result.data.company_hq_location = createEnrichedValue(location, 80);
    }
  }

  // Find and scrape subpages if we still have gaps
  const subpageUrls = findSubpageUrls($, normalizedUrl);
  
  for (const subUrl of subpageUrls) {
    // Check if we still need data
    const neededFields = requiredFields.filter((f) => !result.data[f]);
    if (neededFields.length === 0) break;

    const subpage = await scrapePage(subUrl);
    if (!subpage) continue;

    result.pagesScraped.push(subUrl);

    // Try to extract missing data from subpage
    if (neededFields.includes('company_email')) {
      const emails = extractEmails(subpage.$, subpage.html);
      if (emails.length > 0) {
        result.data.company_email = createEnrichedValue(emails[0]);
      }
    }

    if (neededFields.includes('company_phone')) {
      const phones = extractPhones(subpage.$, subpage.html);
      if (phones.length > 0) {
        result.data.company_phone = createEnrichedValue(phones[0]);
      }
    }

    if (neededFields.includes('company_hq_location') && !result.data.company_hq_location) {
      const location = extractLocation(subpage.$);
      if (location) {
        result.data.company_hq_location = createEnrichedValue(location, 85);
      }
    }
  }

  return result;
};

export const extractDomainFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};
