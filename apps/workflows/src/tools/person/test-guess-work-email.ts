/**
 * Test script for GuessWorkEmail tool
 * 
 * Run with: tsx src/tools/person/test-guess-work-email.ts
 * 
 * Required env vars:
 * - HUNTER_API_KEY (optional but recommended)
 * - PROSPEO_API_KEY (optional but recommended)
 * 
 * Note: At least one API key should be set
 */

import { guessWorkEmail } from "./guess-work-email";

async function runTests() {
    console.log("🧪 Testing GuessWorkEmail Tool\n");
    console.log("=".repeat(70));

    // Check env vars
    const hasHunter = !!process.env.HUNTER_API_KEY;
    const hasProspeo = !!process.env.PROSPEO_API_KEY;

    console.log("\nAPI Keys configured:");
    console.log(`  Hunter.io: ${hasHunter ? "✅" : "❌"}`);
    console.log(`  Prospeo: ${hasProspeo ? "✅" : "❌"}`);

    if (!hasHunter && !hasProspeo) {
        console.error("\n❌ No API keys configured. Set HUNTER_API_KEY or PROSPEO_API_KEY");
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
            if (result.hunterScore !== undefined) {
                console.log(`   Hunter Score: ${result.hunterScore}`);
            }
            if (result.sources && result.sources.length > 0) {
                console.log(`   Sources: ${result.sources.slice(0, 2).join(", ")}`);
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
