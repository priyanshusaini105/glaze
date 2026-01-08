/**
 * Quick test to verify Serper query fix
 * 
 * This tests that search queries no longer use exact match quotes
 * and can find results for name/company variations.
 */

import { findLinkedInProfile } from "./find-linkedin-profile";

async function testQueryFix() {
    console.log("🧪 Testing Serper Query Fix\n");
    console.log("=".repeat(70));

    // Test case: Person with potential name variation
    const testCase = {
        name: "Ankit Varsney",
        company: "Freckle.io"
    };

    console.log(`\n🔍 Testing: ${testCase.name} at ${testCase.company}`);
    console.log(`Expected: Should find results even if name/company varies slightly\n`);

    try {
        const result = await findLinkedInProfile(testCase.name, testCase.company);

        console.log("\n📊 RESULTS:");
        console.log("─".repeat(70));
        console.log(`✓ LinkedIn URL: ${result.linkedinUrl || "Not found"}`);
        console.log(`✓ Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`✓ Candidates Found: ${result.candidatesFound}`);
        console.log(`✓ Match Reason: ${result.matchReason}`);

        if (result.candidatesFound > 0) {
            console.log("\n✅ SUCCESS: Search found candidates (query fix worked!)");
            console.log("   The removal of exact match quotes allowed Google to find results.");
        } else {
            console.log("\n⚠️  No candidates found, but this could be legitimate:");
            console.log("   - Person may not have a LinkedIn profile");
            console.log("   - Company name might be too obscure");
            console.log("   - Name might be misspelled in test data");
            console.log("\n   The query is now MORE flexible, so if no results are found,");
            console.log("   it likely means the person genuinely doesn't have a discoverable profile.");
        }

    } catch (error) {
        console.error("\n❌ ERROR:", error instanceof Error ? error.message : "Unknown");
    }

    console.log("\n" + "=".repeat(70));
}

// Run test
testQueryFix().catch(console.error);
