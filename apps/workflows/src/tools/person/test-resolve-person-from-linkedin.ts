/**
 * Test script for ResolvePersonFromLinkedIn tool
 * 
 * Run with: tsx src/tools/person/test-resolve-person-from-linkedin.ts
 * 
 * Required env vars:
 * - GROQ_API_KEY
 * - SERPER_API_KEY
 */

import { resolvePersonFromLinkedIn } from "./resolve-person-from-linkedin";

async function runTests() {
    console.log("🧪 Testing ResolvePersonFromLinkedIn Tool\n");
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

    // Test cases
    const testCases = [
        // Test with LinkedIn URL
        {
            name: "Test with LinkedIn URL",
            options: {
                linkedinUrl: "https://www.linkedin.com/in/guillaumemoubeche/",
            },
        },
        // Test with name + company
        {
            name: "Test with name + company",
            options: {
                name: "Karri Saarinen",
                company: "Linear",
            },
        },
        // Test with just name
        {
            name: "Test with just name (well-known person)",
            options: {
                name: "Pieter Levels",
            },
        },
    ];

    for (const testCase of testCases) {
        console.log(`\n\n🔍 ${testCase.name}`);
        console.log("-".repeat(70));
        console.log("Input:", testCase.options);

        try {
            const startTime = Date.now();
            const result = await resolvePersonFromLinkedIn(testCase.options);
            const elapsed = Date.now() - startTime;

            console.log("\n✅ Result:");
            console.log(`   Name: ${result.name || "Not found"}`);
            console.log(`   Title: ${result.title || "Not found"}`);
            console.log(`   Company: ${result.company || "Not found"}`);
            console.log(`   Location: ${result.location || "Not found"}`);
            console.log(`   LinkedIn URL: ${result.linkedinUrl || "Not found"}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Fields from snippets: ${result.fieldsFromSnippets.join(", ") || "none"}`);
            console.log(`   Fields from scrape: ${result.fieldsFromScrape.join(", ") || "none"}`);
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
