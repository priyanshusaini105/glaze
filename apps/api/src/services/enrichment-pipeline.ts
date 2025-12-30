import { Job } from 'bullmq';
import {
  EnrichmentJobInput,
  EnrichmentJobResult,
  EnrichmentData,
  EnrichmentField,
  EnrichmentCost,
  StageResult
} from '../types/enrichment';
import { scrapeWebsite, extractDomainFromUrl } from './website-scraper';
import { searchForCompanyData, isSearchServiceConfigured } from './search-service';
import { lookupPersonByLinkedIn, isContactOutConfigured, requiresContactOut } from './contactout-client';
import { analyzeGaps, mergeEnrichmentData, buildProvenance, shouldUsePaidLayer } from './gap-analyzer';
import { getCachedFields, updateCachedEnrichment } from './enrichment-cache';

export type PipelineContext = {
  job: Job<EnrichmentJobInput, EnrichmentJobResult>;
  input: EnrichmentJobInput;
  data: EnrichmentData;
  stages: StageResult[];
  notes: string[];
  totalCostCents: number;
  remainingBudgetCents: number;
};

/**
 * Normalize and detect input type from URL
 */
export const normalizeInput = (url: string): { normalizedUrl: string; inputType: 'linkedin_profile' | 'company_website' | 'company_linkedin' } => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('linkedin.com/in/')) {
    return { 
      normalizedUrl: url, 
      inputType: 'linkedin_profile' 
    };
  }
  
  if (lowerUrl.includes('linkedin.com/company/')) {
    return { 
      normalizedUrl: url, 
      inputType: 'company_linkedin' 
    };
  }
  
  // Assume company website
  let normalizedUrl = url;
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  
  return { 
    normalizedUrl, 
    inputType: 'company_website' 
  };
};

/**
 * Stage 0: Check cache for existing data
 */
const runCacheStage = async (ctx: PipelineContext): Promise<void> => {
  const startTime = Date.now();
  
  if (ctx.input.skipCache) {
    ctx.notes.push('Cache skipped by request');
    return;
  }

  try {
    const cachedData = await getCachedFields(ctx.input.normalizedUrl, ctx.input.requiredFields);
    const cachedFields = Object.keys(cachedData) as EnrichmentField[];

    if (cachedFields.length > 0) {
      const { merged } = mergeEnrichmentData(ctx.data, cachedData);
      ctx.data = merged;

      ctx.stages.push({
        stage: 'free',
        source: 'cache',
        data: cachedData,
        costCents: 0,
        durationMs: Date.now() - startTime
      });

      ctx.notes.push(`Cache hit: ${cachedFields.length} fields`);
    }
  } catch (err) {
    ctx.notes.push(`Cache lookup failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }
};

/**
 * Stage 1: Free layer - Website scraping
 */
const runFreeLayer = async (ctx: PipelineContext): Promise<void> => {
  const startTime = Date.now();
  const gaps = analyzeGaps(ctx.data, ctx.input.requiredFields).gaps;
  
  if (gaps.length === 0) {
    ctx.notes.push('Free layer skipped: no gaps');
    return;
  }

  // Determine what to scrape based on input type
  let websiteUrl: string | null = null;

  if (ctx.input.detectedInputType === 'company_website') {
    websiteUrl = ctx.input.normalizedUrl;
  } else if (ctx.input.detectedInputType === 'company_linkedin') {
    // For company LinkedIn, we'd need to extract website from LinkedIn page
    // For now, skip website scraping
    ctx.notes.push('Company LinkedIn: website scrape not implemented yet');
  } else if (ctx.input.detectedInputType === 'linkedin_profile') {
    // For person LinkedIn, we might extract company website later
    ctx.notes.push('Person LinkedIn: direct company website scrape not applicable');
  }

  if (websiteUrl) {
    try {
      ctx.job.updateProgress(20);
      
      const scrapeResult = await scrapeWebsite(websiteUrl, gaps);
      
      if (Object.keys(scrapeResult.data).length > 0) {
        const { merged } = mergeEnrichmentData(ctx.data, scrapeResult.data);
        ctx.data = merged;

        ctx.stages.push({
          stage: 'free',
          source: 'website_scrape',
          data: scrapeResult.data,
          costCents: 0,
          durationMs: Date.now() - startTime
        });

        ctx.notes.push(`Website scrape: ${scrapeResult.pagesScraped.length} pages, ${Object.keys(scrapeResult.data).length} fields`);
      }

      if (scrapeResult.errors.length > 0) {
        ctx.notes.push(`Website scrape errors: ${scrapeResult.errors.join(', ')}`);
      }
    } catch (err) {
      ctx.stages.push({
        stage: 'free',
        source: 'website_scrape',
        data: {},
        costCents: 0,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'unknown'
      });
    }
  }

  ctx.job.updateProgress(40);
};

/**
 * Stage 2: Cheap layer - Search enrichment
 */
const runCheapLayer = async (ctx: PipelineContext): Promise<void> => {
  const startTime = Date.now();
  const analysis = analyzeGaps(ctx.data, ctx.input.requiredFields);
  
  if (analysis.gaps.length === 0) {
    ctx.notes.push('Search layer skipped: no gaps');
    return;
  }

  // Only search for company data fields
  const companyGaps = analysis.gaps.filter((f) => f.startsWith('company_'));
  
  if (companyGaps.length === 0 || !isSearchServiceConfigured()) {
    if (!isSearchServiceConfigured()) {
      ctx.notes.push('Search layer skipped: Serper API not configured');
    }
    return;
  }

  try {
    ctx.job.updateProgress(50);

    // Get company name for search
    const companyName = ctx.data.company_name?.value as string | undefined;
    const domain = extractDomainFromUrl(ctx.input.normalizedUrl);

    if (!companyName && !domain) {
      ctx.notes.push('Search layer skipped: no company identifier');
      return;
    }

    const searchResult = await searchForCompanyData(
      companyName || domain || '',
      domain,
      companyGaps
    );

    if (Object.keys(searchResult.data).length > 0) {
      const { merged } = mergeEnrichmentData(ctx.data, searchResult.data);
      ctx.data = merged;

      ctx.stages.push({
        stage: 'cheap',
        source: 'search_result',
        data: searchResult.data,
        costCents: searchResult.costCents,
        durationMs: Date.now() - startTime
      });

      ctx.totalCostCents += searchResult.costCents;
      ctx.remainingBudgetCents -= searchResult.costCents;

      ctx.notes.push(`Search: ${searchResult.searchesPerformed} queries, ${Object.keys(searchResult.data).length} fields, $${(searchResult.costCents / 100).toFixed(2)}`);
    }

    if (searchResult.errors.length > 0) {
      ctx.notes.push(`Search errors: ${searchResult.errors.join(', ')}`);
    }
  } catch (err) {
    ctx.stages.push({
      stage: 'cheap',
      source: 'search_result',
      data: {},
      costCents: 0,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'unknown'
    });
  }

  ctx.job.updateProgress(60);
};

/**
 * Stage 3: Paid layer - ContactOut for person data
 */
const runPaidLayer = async (ctx: PipelineContext): Promise<void> => {
  const startTime = Date.now();
  const analysis = analyzeGaps(ctx.data, ctx.input.requiredFields);
  
  const { proceed, reason } = shouldUsePaidLayer(
    analysis.gaps,
    ctx.remainingBudgetCents,
    analysis.completionPercentage
  );

  if (!proceed) {
    ctx.notes.push(`Paid layer skipped: ${reason}`);
    return;
  }

  // Check if we need ContactOut (person email/phone)
  if (!requiresContactOut(analysis.gaps)) {
    ctx.notes.push('Paid layer skipped: no ContactOut fields needed');
    return;
  }

  if (!isContactOutConfigured()) {
    ctx.notes.push('Paid layer skipped: ContactOut not configured');
    return;
  }

  // Only use ContactOut for LinkedIn profile inputs
  if (ctx.input.detectedInputType !== 'linkedin_profile') {
    ctx.notes.push('Paid layer skipped: ContactOut requires LinkedIn profile URL');
    return;
  }

  try {
    ctx.job.updateProgress(70);

    const lookupResult = await lookupPersonByLinkedIn(
      ctx.input.normalizedUrl,
      analysis.gaps,
      ctx.remainingBudgetCents
    );

    if (lookupResult.success && Object.keys(lookupResult.data).length > 0) {
      const { merged } = mergeEnrichmentData(ctx.data, lookupResult.data);
      ctx.data = merged;

      ctx.stages.push({
        stage: 'paid',
        source: 'contactout',
        data: lookupResult.data,
        costCents: lookupResult.costCents,
        durationMs: Date.now() - startTime
      });

      ctx.totalCostCents += lookupResult.costCents;
      ctx.remainingBudgetCents -= lookupResult.costCents;

      ctx.notes.push(`ContactOut: ${Object.keys(lookupResult.data).length} fields, $${(lookupResult.costCents / 100).toFixed(2)}`);
    } else if (lookupResult.error) {
      ctx.notes.push(`ContactOut error: ${lookupResult.error}`);
    }
  } catch (err) {
    ctx.stages.push({
      stage: 'paid',
      source: 'contactout',
      data: {},
      costCents: 0,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'unknown'
    });
  }

  ctx.job.updateProgress(80);
};

/**
 * Finalize and cache results
 */
const finalizeResult = async (ctx: PipelineContext): Promise<EnrichmentJobResult> => {
  ctx.job.updateProgress(90);

  // Cache the enriched data for future use
  if (Object.keys(ctx.data).length > 0) {
    await updateCachedEnrichment(ctx.input.normalizedUrl, ctx.data);
    ctx.notes.push('Results cached');
  }

  // Build final analysis
  const finalAnalysis = analyzeGaps(ctx.data, ctx.input.requiredFields);
  const provenance = buildProvenance(ctx.data);

  // Build cost breakdown
  const costBreakdown: EnrichmentCost['breakdown'] = ctx.stages
    .filter((s) => s.costCents > 0)
    .map((s) => ({
      source: s.source,
      costCents: s.costCents,
      fieldsEnriched: Object.keys(s.data) as string[]
    }));

  ctx.job.updateProgress(100);

  return {
    data: ctx.data,
    gaps: finalAnalysis.gaps,
    cost: {
      totalCents: ctx.totalCostCents,
      breakdown: costBreakdown
    },
    provenance,
    notes: ctx.notes,
    status: 'completed',
    completedAt: new Date().toISOString()
  };
};

/**
 * Main waterfall pipeline executor
 */
export const runEnrichmentPipeline = async (
  job: Job<EnrichmentJobInput, EnrichmentJobResult>
): Promise<EnrichmentJobResult> => {
  const input = job.data;
  
  const ctx: PipelineContext = {
    job,
    input,
    data: {},
    stages: [],
    notes: [],
    totalCostCents: 0,
    remainingBudgetCents: input.budgetCents || 0
  };

  try {
    job.updateProgress(5);
    ctx.notes.push(`Starting enrichment for ${input.detectedInputType}: ${input.normalizedUrl}`);
    ctx.notes.push(`Required fields: ${input.requiredFields.join(', ')}`);
    ctx.notes.push(`Budget: $${((input.budgetCents || 0) / 100).toFixed(2)}`);

    // Run waterfall stages
    await runCacheStage(ctx);
    await runFreeLayer(ctx);
    await runCheapLayer(ctx);
    await runPaidLayer(ctx);

    return await finalizeResult(ctx);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Pipeline failed';
    ctx.notes.push(`Pipeline error: ${error}`);

    return {
      data: ctx.data,
      gaps: ctx.input.requiredFields,
      cost: {
        totalCents: ctx.totalCostCents,
        breakdown: []
      },
      provenance: buildProvenance(ctx.data),
      notes: ctx.notes,
      status: 'failed',
      error,
      completedAt: new Date().toISOString()
    };
  }
};
