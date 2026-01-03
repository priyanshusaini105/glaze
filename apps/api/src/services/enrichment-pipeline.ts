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
import { analyzeGaps, mergeEnrichmentData, buildProvenance, shouldUsePaidLayer } from './gap-analyzer';
import { getCachedFields, updateCachedEnrichment } from './enrichment-cache';
import {
  LinkedInProfileProvider,
  LinkedInCompanyProvider,
  detectLinkedInUrlType,
  extractLinkedInUrl,
  shouldUseLinkedInProvider,
} from './linkedin-provider';
import { Effect } from 'effect';

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
 * Stage 3: Premium layer - LinkedIn API enrichment
 */
const runPremiumLayer = async (ctx: PipelineContext): Promise<void> => {
  const startTime = Date.now();
  const analysis = analyzeGaps(ctx.data, ctx.input.requiredFields);
  
  if (analysis.gaps.length === 0) {
    ctx.notes.push('LinkedIn layer skipped: no gaps');
    return;
  }

  // Check if LinkedIn is enabled
  const linkedInEnabled = process.env.LINKEDIN_ENRICHMENT_ENABLED !== 'false';
  if (!linkedInEnabled) {
    ctx.notes.push('LinkedIn layer skipped: disabled in config');
    return;
  }

  // Minimum budget check
  const minBudget = Number(process.env.LINKEDIN_MIN_BUDGET_CENTS) || 10;
  if (ctx.remainingBudgetCents < minBudget) {
    ctx.notes.push(`LinkedIn layer skipped: budget too low (${ctx.remainingBudgetCents}¢ < ${minBudget}¢)`);
    return;
  }

  try {
    ctx.job.updateProgress(65);

    // Detect LinkedIn URL from input or existing data
    let linkedInUrl: string | null = null;
    let linkedInType: 'profile' | 'company' | null = null;

    // First, check the input URL
    const inputType = detectLinkedInUrlType(ctx.input.normalizedUrl);
    if (inputType) {
      linkedInUrl = ctx.input.normalizedUrl;
      linkedInType = inputType;
    } else {
      // Check if we found LinkedIn URLs in previous stages
      const extracted = extractLinkedInUrl(ctx.data);
      if (extracted) {
        linkedInUrl = extracted.url;
        linkedInType = extracted.type;
      }
    }

    // Decide if we should use LinkedIn
    const decision = shouldUseLinkedInProvider({
      gaps: analysis.gaps,
      remainingBudgetCents: ctx.remainingBudgetCents,
      linkedInUrl,
      linkedInType,
    });

    if (!decision.shouldUse) {
      ctx.notes.push(`LinkedIn layer skipped: ${decision.reason}`);
      return;
    }

    ctx.notes.push(`LinkedIn layer: ${decision.reason}`);

    // Select the appropriate provider
    const provider =
      linkedInType === 'profile'
        ? LinkedInProfileProvider
        : LinkedInCompanyProvider;

    ctx.job.updateProgress(70);

    // Call LinkedIn API via Effect
    const enrichmentEffect = provider.lookup(linkedInUrl!);
    
    const linkedInData = await Effect.runPromise(enrichmentEffect).catch(
      (error) => {
        ctx.notes.push(
          `LinkedIn API error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return null;
      }
    );

    if (linkedInData && Object.keys(linkedInData).length > 0) {
      // Convert back to EnrichmentData format
      const typedData = linkedInData as unknown as EnrichmentData;
      
      // Merge with existing data
      const { merged } = mergeEnrichmentData(ctx.data, typedData);
      ctx.data = merged;

      ctx.stages.push({
        stage: 'premium',
        source: 'linkedin_api',
        data: typedData,
        costCents: provider.costCents,
        durationMs: Date.now() - startTime,
      });

      ctx.totalCostCents += provider.costCents;
      ctx.remainingBudgetCents -= provider.costCents;

      ctx.notes.push(
        `LinkedIn ${linkedInType}: ${Object.keys(linkedInData).length} fields, $${(provider.costCents / 100).toFixed(2)}`
      );
    }

    ctx.job.updateProgress(80);
  } catch (err) {
    ctx.stages.push({
      stage: 'premium',
      source: 'linkedin_api',
      data: {},
      costCents: 0,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'unknown',
    });
    
    ctx.notes.push(
      `LinkedIn layer error: ${err instanceof Error ? err.message : 'unknown'}`
    );
  }
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
    await runPremiumLayer(ctx); // New: LinkedIn API layer

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
