/**
 * Test script for Person Resolution Pipeline
 * 
 * Tests:
 * 1. FindLinkedInProfile - Pure identity resolution
 * 2. ResolvePersonFromNameCompany - Full pipeline
 * 
 * Run with: tsx src/tools/person/test-person-pipeline.ts
 * 
 * Required env vars:
 * - GROQ_API_KEY
 * - SERPER_API_KEY
 */

import { findLinkedInProfile } from "./find-linkedin-profile";
import { resolvePersonFromNameCompany } from "./resolve-person-from-name-company";

async function runTests() {
    console.log("🧪 Testing Person Resolution Pipeline\n");
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
        { name: "Guillaume Moubeche", company: "Lemlist" },
        { name: "Karri Saarinen", company: "Linear" },
        { name: "Pieter Levels", company: "Nomad List" },
    ];

    // Test 1: FindLinkedInProfile (identity resolution only)
    console.log("\n\n" + "=".repeat(70));
    console.log("📍 TEST 1: FindLinkedInProfile (Identity Resolution)");
    console.log("=".repeat(70));

    for (const { name, company } of testCases) {
        console.log(`\n🔍 Finding LinkedIn for: ${name} at ${company}`);
        console.log("-".repeat(50));

        try {
            const startTime = Date.now();
            const result = await findLinkedInProfile(name, company);
            const elapsed = Date.now() - startTime;

            console.log("Result:");
            console.log(`   LinkedIn URL: ${result.linkedinUrl || "Not found"}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   Candidates: ${result.candidatesFound}`);
            console.log(`   Reason: ${result.matchReason}`);
            console.log(`   Time: ${elapsed}ms`);

        } catch (error) {
            console.error(`❌ Error: ${error instanceof Error ? error.message : "Unknown"}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Test 2: ResolvePersonFromNameCompany (full pipeline)
    console.log("\n\n" + "=".repeat(70));
    console.log("📍 TEST 2: ResolvePersonFromNameCompany (Full Pipeline)");
    console.log("=".repeat(70));

    for (const { name, company } of testCases) {
        console.log(`\n🔍 Resolving: ${name} at ${company}`);
        console.log("-".repeat(50));

        try {
            const startTime = Date.now();
            const result = await resolvePersonFromNameCompany(name, company);
            const elapsed = Date.now() - startTime;

            console.log("Result:");
            console.log(`   Name: ${result.name || "Not found"}`);
            console.log(`   Title: ${result.title || "Not found"}`);
            console.log(`   Company: ${result.company || "Not found"}`);
            console.log(`   Location: ${result.location || "Not found"}`);
            console.log(`   LinkedIn URL: ${result.linkedinUrl || "Not found"}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   Source: ${result.source}`);
            console.log(`   LinkedIn Anchored: ${result.linkedinAnchored}`);
            console.log(`   Resolution Status: ${result.resolutionStatus}`);
            console.log(`   Fields from snippets: ${result.fieldsFromSnippets.join(", ") || "none"}`);
            console.log(`   Fields from scrape: ${result.fieldsFromScrape.join(", ") || "none"}`);
            console.log(`   Time: ${elapsed}ms`);

        } catch (error) {
            console.error(`❌ Error: ${error instanceof Error ? error.message : "Unknown"}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ All tests complete\n");
}

// Run tests
runTests().catch(console.error);
