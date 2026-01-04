import { logger, task } from "@trigger.dev/sdk/v3";

/**
 * Core enrichment workflow
 * Triggers the data enrichment pipeline for a given company/profile
 */
export const enrichDataTask = task({
  id: "enrich-data",
  maxDuration: 600, // 10 mins
  queue: {
    name: "enrichment",
    concurrencyLimit: 10,
  },
  run: async (
    payload: {
      url: string;
      type: "company_website" | "linkedin_profile" | "company_linkedin";
      requiredFields: string[];
      skipCache?: boolean;
    },
    { ctx }
  ) => {
    logger.log("Starting enrichment task", { payload });

    // TODO: Call the worker service to process this enrichment
    // For now, this is a placeholder that will be implemented
    // once the worker service is set up

    return {
      status: "queued",
      taskId: ctx.run.id,
      message: "Enrichment job queued for processing",
    };
  },
});

/**
 * Batch enrichment workflow
 * Process multiple URLs in parallel
 */
export const batchEnrichTask = task({
  id: "batch-enrich",
  maxDuration: 1800, // 30 mins
  run: async (
    payload: {
      urls: Array<{
        url: string;
        type: "company_website" | "linkedin_profile" | "company_linkedin";
      }>;
      requiredFields?: string[];
    },
    { ctx }
  ) => {
    logger.log("Starting batch enrichment", {
      count: payload.urls.length,
    });

    // TODO: Trigger multiple enrichment tasks in parallel
    // using Trigger.dev's batch execution

    return {
      status: "processing",
      count: payload.urls.length,
      message: "Batch enrichment jobs queued",
    };
  },
});
