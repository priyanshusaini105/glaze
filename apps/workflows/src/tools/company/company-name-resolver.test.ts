import { describe, it, expect } from "vitest";
import { resolveCompanyIdentityFromName } from "./resolve-company-identity-from-name";

describe("Company Name Resolver", () => {
  it("returns FAIL on empty company name", async () => {
    const result = await resolveCompanyIdentityFromName(" ");
    expect(result.confidenceLevel).toBe("FAIL");
    expect(result.reason).toBe("Empty company name");
    expect(result.canonicalCompanyName).toBeNull();
    expect(result.domain).toBeNull();
    expect(result.websiteUrl).toBeNull();
  });

  it("returns FAIL when SERPER_API_KEY is not configured", async () => {
    const result = await resolveCompanyIdentityFromName("Stripe");
    expect(result.confidenceLevel).toBe("FAIL");
    expect(result.reason).toBe("No search results available");
  });
});
