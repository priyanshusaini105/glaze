import { describe, it, expect } from "vitest";
import {
  extractDomain,
  getFirstStringValue,
  mapColumnKeyToFieldMapping,
  normalizeExistingDataToInput,
} from "./normalized-input";

describe("mapColumnKeyToFieldMapping", () => {
  it("maps known column keys", () => {
    expect(mapColumnKeyToFieldMapping("company_name")).toBe("company");
    expect(mapColumnKeyToFieldMapping("company_domain")).toBe("domain");
    expect(mapColumnKeyToFieldMapping("company_website")).toBe("website");
    expect(mapColumnKeyToFieldMapping("person_name")).toBe("name");
    expect(mapColumnKeyToFieldMapping("person_email")).toBe("email");
    expect(mapColumnKeyToFieldMapping("linkedin_url")).toBe("linkedinUrl");
  });

  it("falls back to the original key", () => {
    expect(mapColumnKeyToFieldMapping("unknown_key")).toBe("unknown_key");
  });
});

describe("getFirstStringValue", () => {
  it("returns the first non-empty trimmed string", () => {
    const data: Record<string, unknown> = {
      a: "   ",
      b: 123,
      c: " Reddit ",
      d: "Ignored",
    };

    expect(getFirstStringValue(data, ["a", "b", "c", "d"])).toBe("Reddit");
  });

  it("returns undefined when none of the keys contain a usable string", () => {
    const data: Record<string, unknown> = { a: "", b: null, c: 0 };
    expect(getFirstStringValue(data, ["a", "b", "c", "d"])).toBeUndefined();
  });
});

describe("extractDomain", () => {
  it("extracts hostname from https URL and strips www", () => {
    expect(extractDomain("https://www.reddit.com/r/reactjs")).toBe("reddit.com");
  });

  it("extracts hostname from http URL", () => {
    expect(extractDomain("http://cal.com/")).toBe("cal.com");
  });

  it("strips www and removes paths from protocol-less values", () => {
    expect(extractDomain("www.stripe.com/pricing")).toBe("stripe.com");
    expect(extractDomain("stripe.com/pricing?x=1")).toBe("stripe.com");
  });

  it("returns undefined for empty inputs", () => {
    expect(extractDomain(undefined)).toBeUndefined();
    expect(extractDomain("  ")).toBeUndefined();
  });
});

describe("normalizeExistingDataToInput", () => {
  it("maps company_name to company and website URL to domain", () => {
    const input = normalizeExistingDataToInput({
      rowId: "row",
      tableId: "table",
      existingData: {
        company_name: "Reddit",
        website: "https://www.reddit.com",
      },
    });

    expect(input.company).toBe("Reddit");
    expect(input.domain).toBe("reddit.com");
  });

  it("prefers canonical keys when present", () => {
    const input = normalizeExistingDataToInput({
      rowId: "row",
      tableId: "table",
      existingData: {
        company: "Canonical Co",
        company_name: "Other Co",
        domain: "stripe.com",
        company_domain: "other.com",
      },
    });

    expect(input.company).toBe("Canonical Co");
    expect(input.domain).toBe("stripe.com");
  });

  it("maps common person/email/linkedin variants", () => {
    const input = normalizeExistingDataToInput({
      rowId: "row",
      tableId: "table",
      existingData: {
        person_name: "Ada Lovelace",
        email_address: "ada@example.com",
        linkedin_url: "https://linkedin.com/in/ada",
      },
    });

    expect(input.name).toBe("Ada Lovelace");
    expect(input.email).toBe("ada@example.com");
    expect(input.linkedinUrl).toBe("https://linkedin.com/in/ada");
  });
});
