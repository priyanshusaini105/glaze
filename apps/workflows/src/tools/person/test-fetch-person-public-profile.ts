/**
 * Test script for FetchPersonPublicProfile tool
 * 
 * Run with: tsx src/tools/person/test-fetch-person-public-profile.ts
 * 
 * Required env vars:
 * - GROQ_API_KEY
 * - SERPER_API_KEY
 */

import { fetchPersonPublicProfile } from "./fetch-person-public-profile";

async function runTests() {
    console.log("🧪 Testing FetchPersonPublicProfile Tool\n");
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

    // Test cases - already verified person identities
    const testCases = [
        { name: "Guillaume Moubeche", company: "Lemlist" },
        { name: "Pieter Levels", company: "Nomad List" },
        { name: "Karri Saarinen", company: "Linear" },
    ];

    for (const { name, company } of testCases) {
        console.log(`\n\n🔍 Fetching public profile for: ${name} @ ${company}`);
        console.log("-".repeat(50));

        try {
            const startTime = Date.now();
            const result = await fetchPersonPublicProfile(name, company);
            const elapsed = Date.now() - startTime;

            console.log("Result:");
            console.log(`   Bio: ${result.bio || "Not found"}`);
            console.log(`   Twitter: ${result.socialLinks.twitter || "Not found"}`);
            console.log(`   GitHub: ${result.socialLinks.github || "Not found"}`);
            console.log(`   Website: ${result.socialLinks.personalWebsite || "Not found"}`);
            console.log(`   Source: ${result.source}`);
            if (result.scrapedUrl) {
                console.log(`   Scraped URL: ${result.scrapedUrl}`);
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
