/**
 * Test script for FetchCompanySocials tool
 * 
 * Run with: tsx src/tools/company/test-fetch-company-socials.ts
 */

import { fetchCompanySocials } from "./fetch-company-socials";

async function runTests() {
    console.log("🧪 Testing FetchCompanySocials Tool\n");
    console.log("=".repeat(70));

    // Test cases - companies known to have social links
    const testCases = [
        { url: "linear.app", name: "Linear" },
        { url: "vercel.com", name: "Vercel" },
        { url: "stripe.com", name: "Stripe" },
        { url: "github.com", name: "GitHub" },
    ];

    for (const { url, name } of testCases) {
        console.log(`\n\n🔍 Testing: ${url} (${name})`);
        console.log("-".repeat(70));

        try {
            const result = await fetchCompanySocials(url, name);

            console.log("✅ Result:");
            console.log(`   Pages checked: ${result.pagesChecked.join(", ")}`);
            console.log(`   Links found: ${result.linksFound}`);
            console.log(`   Links validated: ${result.linksValidated}`);
            console.log("\n   Social Links:");

            if (result.socials.twitter) {
                console.log(`   🐦 Twitter: ${result.socials.twitter.url}`);
                console.log(`      Handle: @${result.socials.twitter.handle}`);
                console.log(`      Confidence: ${(result.socials.twitter.confidence * 100).toFixed(1)}%`);
            } else {
                console.log("   🐦 Twitter: null");
            }

            if (result.socials.linkedin) {
                console.log(`   💼 LinkedIn: ${result.socials.linkedin.url}`);
                console.log(`      Confidence: ${(result.socials.linkedin.confidence * 100).toFixed(1)}%`);
            } else {
                console.log("   💼 LinkedIn: null");
            }

            if (result.socials.github) {
                console.log(`   🐙 GitHub: ${result.socials.github.url}`);
                console.log(`      Org: ${result.socials.github.handle}`);
                console.log(`      Confidence: ${(result.socials.github.confidence * 100).toFixed(1)}%`);
            } else {
                console.log("   🐙 GitHub: null");
            }

            if (result.socials.facebook) {
                console.log(`   📘 Facebook: ${result.socials.facebook.url}`);
            }

            if (result.socials.instagram) {
                console.log(`   📸 Instagram: ${result.socials.instagram.url}`);
            }

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
