import { load } from 'cheerio';

export type LinkedInScrapeResult = {
  name: string | null;
  headline: string | null;
  location: string | null;
};

const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchWithTimeout = async (url: string, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`LinkedIn responded with status ${res.status}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

const cleanNameFromTitle = (title?: string | null) => {
  if (!title) return null;

  const withoutLinkedIn = title.replace(/\s*\|\s*LinkedIn.*/i, '').trim();
  const parts = withoutLinkedIn.split(' - ');
  const candidate = parts[0]?.trim() || withoutLinkedIn;

  return candidate || null;
};

const cleanHeadlineFromDescription = (description?: string | null, name?: string | null) => {
  if (!description) return null;

  let text = description.replace(/\s*\|\s*LinkedIn.*/i, '').trim();

  if (name && text.toLowerCase().startsWith(name.toLowerCase())) {
    text = text.slice(name.length).replace(/^\s*-\s*/, '').trim();
  }

  return text || null;
};

export const scrapeLinkedInProfile = async (
  handle: string
): Promise<LinkedInScrapeResult> => {
  const profileUrl = `https://www.linkedin.com/in/${handle}`;
  const html = await fetchWithTimeout(profileUrl);
  const $ = load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || null;
  const name = cleanNameFromTitle(ogTitle);
  const headline = cleanHeadlineFromDescription(ogDescription, name);

  return {
    name,
    headline,
    location: null
  };
};
