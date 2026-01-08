/**
 * Test script for EstimateCompanySize tool
 * 
 * Run with: tsx src/tools/company/test-estimate-company-size.ts
 * 
 * Required env vars:
 * - GROQ_API_KEY
 * - SERPER_API_KEY
 */

import { estimateCompanySize } from "./estimate-company-size";

async function runTests() {
    console.log("🧪 Testing EstimateCompanySize Tool\n");
    console.log("=".repeat(70));

    // Check env vars
    if (!process.env.SERPER_API_KEY) {
        console.error("❌ SERPER_API_KEY not set");
        return;
    }
    if (!process.env.GROQ_API_KEY) {
        console.error("❌ GROQ_API_KEY not set");
        return;
    }

    // Test cases - companies of various sizes
    const testCases = [
        { domain: "stripe.com", name: "Stripe" },
        { domain: "linear.app", name: "Linear" },
        { domain: "openai.com", name: "OpenAI" },
        { domain: "vercel.com", name: "Vercel" },
    ];

    for (const { domain, name } of testCases) {
        console.log(`\n\n🔍 Testing: ${domain} (${name})`);
        console.log("-".repeat(70));

        try {
            const startTime = Date.now();
            const result = await estimateCompanySize(domain, name);
            const elapsed = Date.now() - startTime;

            console.log("✅ Result:");
            console.log(`   Employee Count: ${result.employeeCountRange}`);
            console.log(`   Hiring Status: ${result.hiringStatus}`);
            console.log(`   LinkedIn URL: ${result.linkedinCompanyUrl || "Not found"}`);
            console.log(`   Company Name: ${result.companyName || "Unknown"}`);
            console.log(`   Industry: ${result.industry || "Unknown"}`);
            console.log(`   Location: ${result.location || "Unknown"}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   Source: ${result.source}`);
            if (result.reason) {
                console.log(`   Reason: ${result.reason}`);
            }
            console.log(`   Time: ${elapsed}ms`);

        } catch (error) {
            console.error(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ All tests complete\n");
}

// Run tests
runTests().catch(console.error);
