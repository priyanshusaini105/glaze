/**
 * Test: Company Resolver Tool
 * 
 * Tests the resolveCompanyIdentityFromDomain function
 */

import { resolveCompanyIdentityFromDomain } from "../tools/company/resolve-company-identity-from-domain";

async function testCompanyResolver() {
    console.log("🧪 Testing Company Resolver Tool\n");

    const testDomains = [
        "stripe.com",
        "https://github.com",
        "www.shopify.com",
        "vercel.com",
        "openai.com",
        "gmail.com", // Should be not_found (free email)
        "invalid-domain-xyz123.com", // Should be not_found
    ];

    for (const domain of testDomains) {
        console.log(`\n📍 Testing: ${domain}`);
        console.log("─".repeat(50));

        const result = await resolveCompanyIdentityFromDomain(domain);

        console.log("Result:", {
            status: result.status,
            companyName: result.companyName,
            canonicalDomain: result.canonicalDomain,
            websiteUrl: result.websiteUrl,
        });
    }

    console.log("\n✅ Test complete");
}

// Run if executed directly
testCompanyResolver().catch(console.error);

export { testCompanyResolver };
