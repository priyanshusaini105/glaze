/**
 * Test script for GuessWorkEmail tool
 * 
 * Run with: tsx src/tools/person/test-guess-work-email.ts
 * 
 * Required env vars:
 * - PROSPEO_API_KEY (required)
 * - SERPER_API_KEY (optional, for LinkedIn discovery)
 */

import { guessWorkEmail } from "./guess-work-email";

async function runTests() {
    console.log("🧪 Testing GuessWorkEmail Tool\n");
    console.log("=".repeat(70));

    // Check env vars
    const hasProspeo = !!process.env.PROSPEO_API_KEY;
    const hasSerper = !!process.env.SERPER_API_KEY;

    console.log("\nAPI Keys configured:");
    console.log(`  Prospeo: ${hasProspeo ? "✅" : "❌"}`);
    console.log(`  Serper (LinkedIn discovery): ${hasSerper ? "✅" : "⚠️ (optional)"}`);

    if (!hasProspeo) {
        console.error("\n❌ PROSPEO_API_KEY not configured. Required for email discovery.");
        return;
    }

    // Test cases
    const testCases = [
        { name: "Patrick Collison", domain: "stripe.com" },
        { name: "Karri Saarinen", domain: "linear.app" },
        { name: "Guillame Moubeche", domain: "lemlist.com" },
    ];

    for (const { name, domain } of testCases) {
        console.log(`\n\n🔍 Finding email for: ${name} @ ${domain}`);
        console.log("-".repeat(50));

        try {
            const startTime = Date.now();
            const result = await guessWorkEmail(name, domain);
            const elapsed = Date.now() - startTime;

            console.log("Result:");
            console.log(`   Email: ${result.email || "Not found"}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Verification: ${result.verificationStatus}`);
            if (result.linkedinUrl) {
                console.log(`   LinkedIn: ${result.linkedinUrl}`);
            }
            if (result.personName) {
                console.log(`   Person: ${result.personName}`);
            }
            if (result.currentCompany) {
                console.log(`   Company: ${result.currentCompany}`);
            }
            if (result.reason) {
                console.log(`   Reason: ${result.reason}`);
            }
            console.log(`   Time: ${elapsed}ms`);

        } catch (error) {
            console.error(`❌ Error: ${error instanceof Error ? error.message : "Unknown"}`);
        }

        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ All tests complete\n");
}

// Run tests
runTests().catch(console.error);
