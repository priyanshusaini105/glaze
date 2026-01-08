/**
 * Test script for FetchCompanyProfile tool
 * 
 * Run with: tsx src/tools/company/test-fetch-company-profile.ts
 */

import { fetchCompanyProfile } from "./fetch-company-profile";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../.env" });

async function runTests() {
    console.log("🧪 Testing FetchCompanyProfile Tool\n");
    console.log("=".repeat(60));

    // Test cases
    const testUrls = [
        "shopify.com",          // E-commerce platform
        "reddit.com",           // Social media
        "stripe.com",           // Payment processing
        "openai.com",           // AI research
    ];

    for (const url of testUrls) {
        console.log(`\n\n🔍 Testing: ${url}`);
        console.log("-".repeat(60));

        try {
            const result = await fetchCompanyProfile(url);

            console.log("✅ Result:");
            console.log(`   Industry:    ${result.industry || 'N/A'}`);
            console.log(`   Description: ${result.description || 'N/A'}`);
            console.log(`   Founded:     ${result.founded || 'N/A'}`);
            console.log(`   Location:    ${result.location || 'N/A'}`);
            console.log(`   Confidence:  ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   Tier Used:   ${result.tier}`);
            if (result.reason) {
                console.log(`   Reason:      ${result.reason}`);
            }
        } catch (error) {
            console.error(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }

        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests complete\n");
}

// Run tests
runTests().catch(console.error);
