/**
 * Enrichment Test Script
 * 
 * Run this to test the enrichment system with your test cases.
 * 
 * Usage:
 *   npx tsx apps/workflows/src/scripts/test-enrichment.ts
 * 
 * Or via Trigger.dev:
 *   Use the "run-standard-tests" task in the Trigger.dev dashboard
 */

import { runTestCases, runEnrichment, type TestInput } from "../tools/simple-enrichment";

// Your test cases
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

async function main() {
    console.log("🧪 Starting Enrichment Tests\n");
    console.log("Using FREE providers: GitHub, Wikipedia, OpenCorporates");
    console.log("Using CHEAP providers: Serper (if SERPER_API_KEY is set)");
    console.log("Premium providers: DISABLED (set usePremium: true to enable)\n");
    console.log("=".repeat(60));

    // Run all test cases
    const { results, summary } = await runTestCases(testCases, {
        usePremium: false,  // Set to true to use LinkedIn API
        maxCostCents: 50,   // Max 50 cents total
    });

    // Print detailed results
    console.log("\n📊 DETAILED RESULTS\n");
    
    for (const r of results) {
        const testCase = testCases.find(t => t.id === r.id);
        const status = r.success ? "✅ PASS" : r.matchedFields.length > 0 ? "⚠️ PARTIAL" : "❌ FAIL";
        
        console.log(`\n${status} Test ${r.id}`);
        console.log(`Input: ${JSON.stringify(testCase?.input)}`);
        console.log(`Expected: ${testCase?.expectedFields.join(", ")}`);
        console.log(`Found: ${r.matchedFields.join(", ") || "(none)"}`);
        console.log(`Missing: ${r.missingFields.join(", ") || "(none)"}`);
        console.log(`Cost: ${r.result.costs.totalCents}¢`);
        
        if (Object.keys(r.result.results).length > 0) {
            console.log("Results:");
            for (const [field, data] of Object.entries(r.result.results)) {
                const value = typeof data.value === 'string' 
                    ? data.value.slice(0, 50) + (data.value.length > 50 ? "..." : "")
                    : JSON.stringify(data.value);
                console.log(`  ${field}: ${value} (${(data.confidence * 100).toFixed(0)}% from ${data.source})`);
            }
        }
        
        if (r.result.errors.length > 0) {
            console.log(`Errors: ${r.result.errors.join(", ")}`);
        }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📈 SUMMARY\n");
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Successful: ${summary.successful}`);
    console.log(`⚠️ Partial: ${summary.partial}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`💰 Total Cost: ${summary.totalCostCents}¢ ($${(summary.totalCostCents / 100).toFixed(2)})`);
    console.log(`⏱️ Avg Duration: ${summary.avgDurationMs}ms`);
    console.log("\n" + "=".repeat(60));
}

// Run single test
async function testSingle(input: TestInput, fields: string[]) {
    console.log("\n🔍 Single Enrichment Test");
    console.log(`Input: ${JSON.stringify(input)}`);
    console.log(`Expected: ${fields.join(", ")}\n`);
    
    const result = await runEnrichment(input, fields, { usePremium: false });
    
    console.log("Results:");
    for (const [field, data] of Object.entries(result.results)) {
        console.log(`  ${field}: ${JSON.stringify(data.value)} (${(data.confidence * 100).toFixed(0)}%)`);
    }
    
    console.log(`\nCost: ${result.costs.totalCents}¢`);
    console.log(`Duration: ${result.timing.durationMs}ms`);
    
    if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.join(", ")}`);
    }
    
    return result;
}

// Check environment
function checkEnv() {
    console.log("\n🔧 Environment Check\n");
    
    const envVars = [
        { key: "GROQ_API_KEY", name: "Groq (LLM)", required: false },
        { key: "SERPER_API_KEY", name: "Serper (SERP)", required: false },
        { key: "GITHUB_TOKEN", name: "GitHub (Rate Limit)", required: false },
        { key: "PROSPEO_API_KEY", name: "Prospeo (Email)", required: false },
        { key: "HUNTER_API_KEY", name: "Hunter (Email)", required: false },
        { key: "RAPIDAPI_KEY", name: "LinkedIn (Premium)", required: false },
    ];
    
    for (const { key, name, required } of envVars) {
        const value = process.env[key];
        const status = value ? "✅" : (required ? "❌" : "⚪");
        console.log(`${status} ${name}: ${value ? "Configured" : "Not set"}`);
    }
    
    console.log("");
}

// Main execution
checkEnv();
main().catch(console.error);
