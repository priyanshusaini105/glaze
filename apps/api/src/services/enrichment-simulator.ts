import type { EnrichmentField, EnrichmentData, EnrichedValue, EnrichmentSource } from '../types/enrichment';

/**
 * Simulates enrichment with realistic delays and mock data
 */

const MOCK_COMPANY_DATA = {
  company_name: ['Acme Corp', 'TechStart Inc', 'Global Solutions Ltd', 'InnovateCo', 'DataFlow Systems'],
  company_description: [
    'Leading provider of innovative software solutions',
    'AI-powered analytics platform for enterprises',
    'Cloud infrastructure and DevOps tools',
    'B2B SaaS for sales automation'
  ],
  company_website: ['acme.com', 'techstart.io', 'global-solutions.com', 'innovateco.ai'],
  company_hq_location: ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA'],
  company_employee_count: ['50-100', '100-500', '500-1000', '1000-5000', '10-50'],
  company_industry: ['Software', 'Technology', 'SaaS', 'AI/ML', 'Cloud Computing', 'FinTech'],
  company_founded_year: ['2015', '2018', '2020', '2016', '2019', '2021'],
  company_revenue: ['$1M-$5M', '$5M-$10M', '$10M-$50M', '$50M-$100M'],
  company_funding: ['Seed', 'Series A', 'Series B', 'Series C', 'Bootstrapped'],
  company_linkedin: ['linkedin.com/company/acme-corp', 'linkedin.com/company/techstart'],
  company_twitter: ['@acmecorp', '@techstart', '@innovateco'],
  company_email: ['contact@acme.com', 'hello@techstart.io', 'info@innovateco.ai'],
  company_phone: ['+1-555-0100', '+1-555-0200', '+1-555-0300']
};

const MOCK_PERSON_DATA = {
  person_name: ['John Smith', 'Sarah Johnson', 'Michael Chen', 'Emily Davis', 'David Wilson'],
  person_email: ['john.smith@company.com', 'sarah.j@company.com', 'michael@company.com'],
  person_phone: ['+1-555-1000', '+1-555-2000', '+1-555-3000'],
  person_title: ['CEO', 'CTO', 'VP of Sales', 'Head of Marketing', 'Software Engineer', 'Product Manager'],
  person_linkedin: ['linkedin.com/in/johnsmith', 'linkedin.com/in/sarahjohnson'],
  person_location: ['San Francisco, CA', 'New York, NY', 'Remote', 'Austin, TX'],
  person_company: ['Acme Corp', 'TechStart Inc', 'Global Solutions Ltd']
};

const MOCK_DATA_MAP: Record<EnrichmentField, string[]> = {
  ...MOCK_COMPANY_DATA,
  ...MOCK_PERSON_DATA
} as any;

/**
 * Get random mock value for a field
 */
function getRandomMockValue(field: EnrichmentField): string {
  const options = MOCK_DATA_MAP[field];
  if (!options || options.length === 0) {
    return `Mock ${field}`;
  }
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get random enrichment source for simulation
 */
function getRandomSource(): EnrichmentSource {
  const sources: EnrichmentSource[] = ['website_scrape', 'linkedin_scrape', 'search_result', 'cache'];
  return sources[Math.floor(Math.random() * sources.length)];
}

/**
 * Simulate delay based on source type
 */
async function simulateDelay(source: EnrichmentSource): Promise<void> {
  const delays: Record<EnrichmentSource, number> = {
    cache: 50, // Very fast
    website_scrape: 800,
    linkedin_scrape: 1200,
    search_result: 600,
    contactout: 1500,
    ai_inference: 2000
  };
  
  const baseDelay = delays[source] || 500;
  const jitter = Math.random() * 300; // Add some randomness
  
  await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
}

/**
 * Simulate enrichment for a single cell/value
 */
export async function simulateEnrichCell(
  requiredFields: EnrichmentField[],
  withDelay: boolean = true
): Promise<EnrichmentData> {
  const data: EnrichmentData = {};
  
  for (const field of requiredFields) {
    const source = getRandomSource();
    
    if (withDelay) {
      await simulateDelay(source);
    }
    
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100
    
    data[field] = {
      value: getRandomMockValue(field),
      confidence,
      source,
      timestamp: new Date().toISOString()
    };
  }
  
  return data;
}

/**
 * Simulate enrichment for an array of values
 */
export async function simulateEnrichArray(
  arrayValues: string[],
  requiredFields: EnrichmentField[],
  withDelay: boolean = true
): Promise<{ index: number; value: string; data: EnrichmentData }[]> {
  const results = [];
  
  for (let i = 0; i < arrayValues.length; i++) {
    const data = await simulateEnrichCell(requiredFields, withDelay);
    results.push({
      index: i,
      value: arrayValues[i],
      data
    });
  }
  
  return results;
}

/**
 * Simulate enrichment for a column (by ID)
 */
export async function simulateEnrichColumn(
  columnId: string,
  requiredFields: EnrichmentField[],
  withDelay: boolean = true
): Promise<{ columnId: string; rowCount: number; sampleData: EnrichmentData[] }> {
  // Simulate 5-10 rows in the column
  const rowCount = Math.floor(Math.random() * 6) + 5;
  const sampleData = [];
  
  // Return sample data for first 3 rows
  for (let i = 0; i < Math.min(3, rowCount); i++) {
    const data = await simulateEnrichCell(requiredFields, withDelay);
    sampleData.push(data);
  }
  
  return {
    columnId,
    rowCount,
    sampleData
  };
}

/**
 * Simulate enrichment for a row (by ID)
 */
export async function simulateEnrichRow(
  rowId: string,
  requiredFields: EnrichmentField[],
  withDelay: boolean = true
): Promise<{ rowId: string; data: EnrichmentData }> {
  const data = await simulateEnrichCell(requiredFields, withDelay);
  
  return {
    rowId,
    data
  };
}

/**
 * Calculate simulated cost
 */
export function calculateSimulatedCost(
  dataType: 'cell' | 'array' | 'column' | 'row',
  count: number = 1
): number {
  const baseCost = {
    cell: 10, // 10 cents per cell
    array: 8, // 8 cents per item (bulk discount)
    column: 5, // 5 cents per cell in column (bigger discount)
    row: 10 // 10 cents per row
  };
  
  return baseCost[dataType] * count;
}
