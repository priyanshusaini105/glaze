/**
 * Test script for GenericWebSearch tool
 * 
 * Run with: tsx src/tools/generic/test-generic-web-search.ts
 * 
 * Required env vars:
 * - GROQ_API_KEY
 * - SERPER_API_KEY
 */

import { genericWebSearch } from "./generic-web-search";

async function runTests() {
    console.log("🧪 Testing GenericWebSearch Tool (Ultimate Fallback)\n");
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

    // Test cases - various field types
    const testCases = [
        {
            name: "Company founding year",
            targetField: "founded",
            context: { company: "Stripe", domain: "stripe.com" },
        },
        {
            name: "Company industry",
            targetField: "industry",
            context: { company: "Linear", domain: "linear.app" },
        },
        {
            name: "Person bio",
            targetField: "bio",
            context: { name: "Pieter Levels", company: "Nomad List" },
        },
        {
            name: "Company funding",
            targetField: "funding",
            context: { company: "OpenAI" },
        },
    ];

    for (const { name, targetField, context } of testCases) {
        console.log(`\n\n🔍 Test: ${name}`);
        console.log(`   Target field: ${targetField}`);
        console.log(`   Context: ${JSON.stringify(context)}`);
        console.log("-".repeat(50));

        try {
            const startTime = Date.now();
            const result = await genericWebSearch(targetField, context);
            const elapsed = Date.now() - startTime;

            console.log("Result:");
            console.log(`   Value: ${result.value || "Not found"}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Snippets used: ${result.snippetsUsed}`);
            console.log(`   Query: ${result.searchQuery}`);
            if (result.reason) {
                console.log(`   Reason: ${result.reason.slice(0, 100)}...`);
            }
            console.log(`   Time: ${elapsed}ms`);

        } catch (error) {
            console.error(`❌ Error: ${error instanceof Error ? error.message : "Unknown"}`);
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ All tests complete\n");
}

// Run tests
runTests().catch(console.error);
