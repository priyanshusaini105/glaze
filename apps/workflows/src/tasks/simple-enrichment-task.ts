/**
 * Simple Enrichment Task
 * 
 * A Trigger.dev task for running the simplified enrichment system
 * with your test cases.
 * 
 * Prioritizes free/cheap APIs:
 * - GitHub (0x - free)
 * - Wikipedia/Wikidata (0x - free)
 * - OpenCorporates (0.5x - generous free tier)
 * - Serper (1x - 2500 searches/month free)
 * - Groq (0.5x - generous free tier)
 */

import { task, logger } from "@trigger.dev/sdk";
import { runEnrichment, runTestCases, type TestInput, type EnrichmentResult } from "../tools/simple-enrichment";

/**
 * Payload for single enrichment
 */
export interface SimpleEnrichmentPayload {
    input: TestInput;
    expectedFields: string[];
    options?: {
        usePremium?: boolean;
        maxCostCents?: number;
    };
}

/**
 * Payload for batch test cases
 */
export interface BatchTestCasesPayload {
    testCases: Array<{
        id: number;
        input: TestInput;
        expectedFields: string[];
        expectedBehavior?: string;
    }>;
    options?: {
        usePremium?: boolean;
        maxCostCents?: number;
    };
}

/**
 * Single enrichment task
 */
export const simpleEnrichmentTask = task({
    id: "simple-enrichment",
    maxDuration: 120, // 2 minutes
    retry: {
        maxAttempts: 2,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 5000,
    },
    queue: {
        name: "simple-enrichment",
        concurrencyLimit: 5,
    },
    run: async (payload: SimpleEnrichmentPayload): Promise<EnrichmentResult> => {
        logger.info("🚀 Simple Enrichment Task: Starting", {
            input: payload.input,
            expectedFields: payload.expectedFields,
        });

        const result = await runEnrichment(
            payload.input,
            payload.expectedFields,
            payload.options || {}
        );

        logger.info("✅ Simple Enrichment Task: Complete", {
            fieldsFound: Object.keys(result.results).length,
            totalCost: result.costs.totalCents,
            durationMs: result.timing.durationMs,
        });

        return result;
    },
});

/**
 * Batch test cases task
 */
export const batchTestCasesTask = task({
    id: "batch-test-cases",
    maxDuration: 600, // 10 minutes
    retry: {
        maxAttempts: 1,
    },
    queue: {
        name: "batch-test-cases",
        concurrencyLimit: 1,
    },
    run: async (payload: BatchTestCasesPayload) => {
        logger.info("🧪 Batch Test Cases: Starting", {
            count: payload.testCases.length,
        });

        const { results, summary } = await runTestCases(
            payload.testCases,
            payload.options || {}
        );

        logger.info("📊 Batch Test Cases: Summary", summary);

        return {
            results,
            summary,
        };
    },
});

/**
 * Pre-defined test cases task
 * 
 * Runs the standard test cases you provided
 */
export const runStandardTestsTask = task({
    id: "run-standard-tests",
    maxDuration: 600,
    run: async (payload: { usePremium?: boolean; maxCostCents?: number }) => {
        const testCases = [
            // LinkedIn URL enrichment
            {
                id: 1,
                input: { linkedinUrl: "https://www.linkedin.com/in/guillaumemoubeche/" },
                expectedFields: ["name", "email", "title", "company", "location"]
            },
            {
                id: 2,
                input: { linkedinUrl: "https://www.linkedin.com/in/levelsio/" },
                expectedFields: ["name", "title", "socialLinks.twitter", "company"]
            },

            // Name + Company enrichment
            {
                id: 3,
                input: { name: "Patrick Collison", company: "Stripe" },
                expectedFields: ["email", "title", "location", "socialLinks.twitter"]
            },
            {
                id: 4,
                input: { name: "Guillermo Rauch", company: "Vercel" },
                expectedFields: ["email", "title", "socialLinks.github"]
            },
            {
                id: 5,
                input: { name: "Sahil Lavingia", company: "Gumroad" },
                expectedFields: ["email", "title", "location", "bio"]
            },

            // Company domain enrichment
            {
                id: 6,
                input: { domain: "cal.com" },
                expectedFields: ["company", "industry", "employeeCount", "techStack", "funding"]
            },
            {
                id: 7,
                input: { domain: "linear.app" },
                expectedFields: ["company", "industry", "founded", "socialLinks"]
            },
            {
                id: 8,
                input: { domain: "resend.com" },
                expectedFields: ["company", "description", "contactInfo.email"]
            },

            // Edge cases
            {
                id: 9,
                input: { name: "John Smith", company: "Google" },
                expectedFields: ["title"],
                expectedBehavior: "Should request more identifiers or return low confidence"
            },
            {
                id: 10,
                input: { domain: "notarealcompany12345.com" },
                expectedFields: [],
                expectedBehavior: "Should return empty or error"
            }
        ];

        logger.info("🧪 Running Standard Tests", {
            count: testCases.length,
            usePremium: payload.usePremium,
        });

        const { results, summary } = await runTestCases(testCases, {
            usePremium: payload.usePremium,
            maxCostCents: payload.maxCostCents,
        });

        // Log detailed results
        for (const r of results) {
            const status = r.success ? "✅" : r.matchedFields.length > 0 ? "⚠️" : "❌";
            logger.info(`${status} Test ${r.id}`, {
                input: testCases.find(t => t.id === r.id)?.input,
                found: Object.keys(r.result.results),
                missing: r.missingFields,
                cost: r.result.costs.totalCents,
            });
        }

        logger.info("📊 Final Summary", summary);

        return {
            results,
            summary,
            costAnalysis: {
                totalCents: summary.totalCostCents,
                totalDollars: (summary.totalCostCents / 100).toFixed(2),
                avgPerTest: (summary.totalCostCents / testCases.length).toFixed(2),
            },
        };
    },
});
