import { EnrichmentData, EnrichedValue, EnrichmentField } from '../types/enrichment';

const CONTACTOUT_API_KEY = process.env.CONTACTOUT_API_KEY || '';
const CONTACTOUT_BASE_URL = 'https://api.contactout.com/v1';
const COST_PER_LOOKUP_CENTS = 25; // Approx $0.25 per person lookup

export type ContactOutPersonResult = {
  email?: string;
  phone?: string;
  name?: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
};

export type ContactOutLookupResult = {
  data: Partial<EnrichmentData>;
  costCents: number;
  success: boolean;
  error?: string;
};

const createEnrichedValue = (value: string | null, confidence = 80): EnrichedValue => ({
  value,
  confidence,
  source: 'contactout',
  timestamp: new Date().toISOString()
});

/**
 * Lookup person contact info by LinkedIn URL
 * ContactOut is used ONLY for person data (email/phone)
 * Never use for company data like revenue/size
 */
export const lookupPersonByLinkedIn = async (
  linkedinUrl: string,
  requiredFields: EnrichmentField[],
  budgetCents: number
): Promise<ContactOutLookupResult> => {
  const result: ContactOutLookupResult = {
    data: {},
    costCents: 0,
    success: false
  };

  // Check if ContactOut is configured
  if (!CONTACTOUT_API_KEY) {
    result.error = 'ContactOut API key not configured';
    return result;
  }

  // Check budget
  if (budgetCents < COST_PER_LOOKUP_CENTS) {
    result.error = `Insufficient budget (need ${COST_PER_LOOKUP_CENTS} cents, have ${budgetCents})`;
    return result;
  }

  // Only proceed if we actually need person contact fields
  const personContactFields: EnrichmentField[] = ['person_email', 'person_phone'];
  const neededFields = requiredFields.filter((f) => personContactFields.includes(f));
  
  if (neededFields.length === 0) {
    result.error = 'No person contact fields requested';
    return result;
  }

  try {
    const res = await fetch(`${CONTACTOUT_BASE_URL}/people/linkedin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONTACTOUT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        linkedin_url: linkedinUrl
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      result.error = `ContactOut API error: ${res.status} - ${errorText}`;
      return result;
    }

    const data: ContactOutPersonResult = await res.json();
    result.costCents = COST_PER_LOOKUP_CENTS;
    result.success = true;

    // Map to enrichment fields
    if (requiredFields.includes('person_email') && data.email) {
      result.data.person_email = createEnrichedValue(data.email, 85);
    }

    if (requiredFields.includes('person_phone') && data.phone) {
      result.data.person_phone = createEnrichedValue(data.phone, 85);
    }

    if (requiredFields.includes('person_name') && data.name) {
      result.data.person_name = createEnrichedValue(data.name, 90);
    }

    if (requiredFields.includes('person_title') && data.title) {
      result.data.person_title = createEnrichedValue(data.title, 85);
    }

    if (requiredFields.includes('person_company') && data.company) {
      result.data.person_company = createEnrichedValue(data.company, 85);
    }

    return result;
  } catch (err) {
    result.error = `ContactOut lookup failed: ${err instanceof Error ? err.message : 'unknown error'}`;
    return result;
  }
};

/**
 * Check if ContactOut service is configured and available
 */
export const isContactOutConfigured = (): boolean => {
  return Boolean(CONTACTOUT_API_KEY);
};

/**
 * Get the cost for a ContactOut lookup
 */
export const getContactOutCost = (): number => {
  return COST_PER_LOOKUP_CENTS;
};

/**
 * Check if fields require paid ContactOut lookup
 * ContactOut should only be used for person email/phone
 */
export const requiresContactOut = (fields: EnrichmentField[]): boolean => {
  const contactOutOnlyFields: EnrichmentField[] = ['person_email', 'person_phone'];
  return fields.some((f) => contactOutOnlyFields.includes(f));
};
