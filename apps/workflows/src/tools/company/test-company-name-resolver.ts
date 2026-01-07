/**
 * Test script for Company Name Resolver
 * 
 * Tests the DNS-like resolution with different company names
 */

import { resolveCompanyFromName } from "./company-name-resolver";

async function testResolver() {
    console.log("🧪 Testing Company Name Resolver\n");
    console.log("=".repeat(60));

    // Test cases from the spec
    const testCases = [
        {
            name: "Stripe",
            description: "Single unique word, should have high confidence",
        },
        {
            name: "Linear",
            description: "Potentially ambiguous name (issue tracker vs fitness)",
        },
        {
            name: "ABC Technologies",
            description: "Generic name, should have low confidence or fail",
        },
        {
            name: "Vercel",
            description: "Unique tech company",
        },
        {
            name: "Glaze",
            description: "Short, potentially ambiguous",
        },
    ];

    for (const testCase of testCases) {
        console.log(`\n📊 Test: ${testCase.name}`);
        console.log(`   ${testCase.description}`);
        console.log("-".repeat(60));

        try {
            const result = await resolveCompanyFromName(testCase.name);

            console.log(`   ✅ Result:`);
            console.log(`      Canonical Name: ${result.canonicalCompanyName ?? "null"}`);
            console.log(`      Website URL:    ${result.websiteUrl ?? "null"}`);
            console.log(`      Domain:         ${result.domain ?? "null"}`);
            console.log(`      Confidence:     ${result.confidence.toFixed(2)} (${result.confidenceLevel})`);

            if (result.reason) {
                console.log(`      Reason:         ${result.reason}`);
            }

            // Interpretation
            if (result.confidenceLevel === "HIGH") {
                console.log(`      💚 Safe to enrich fully`);
            } else if (result.confidenceLevel === "MEDIUM") {
                console.log(`      💛 Public data only`);
            } else if (result.confidenceLevel === "LOW") {
                console.log(`      🧡 Return cautiously`);
            } else {
                console.log(`      ❌ Do not enrich`);
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Tests complete\n");
}

// Run if executed directly
if (require.main === module) {
    testResolver().catch(console.error);
}

export { testResolver };
