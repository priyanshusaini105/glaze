import type { NormalizedInput } from "@/types/enrichment";

export function mapColumnKeyToFieldMapping(columnKey: string): string {
  const mapping: Record<string, string> = {
    company_name: "company",
    company_domain: "domain",
    company_website: "website",
    person_name: "name",
    person_email: "email",
    linkedin_url: "linkedinUrl",
    linkedin: "linkedinUrl",  // Map 'linkedin' column to 'linkedinUrl' field
  };

  return mapping[columnKey] || columnKey;
}

export function getFirstStringValue(
  data: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return undefined;
}

export function extractDomain(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // URL with protocol
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).hostname.replace(/^www\./, "");
    }
  } catch {
    // ignore
  }

  // Domain or URL-like without protocol
  const withoutWww = trimmed.replace(/^www\./, "");
  const stopAt = withoutWww.search(/[/?#]/);
  const hostOnly = stopAt === -1 ? withoutWww : withoutWww.slice(0, stopAt);

  return hostOnly || undefined;
}

export function normalizeExistingDataToInput(
  params: {
    rowId: string;
    tableId: string;
    existingData: Record<string, unknown>;
  }
): NormalizedInput {
  const { rowId, tableId, existingData } = params;

  const company = getFirstStringValue(existingData, [
    "company",
    "company_name",
    "Company",
    "Company Name",
  ]);

  const name = getFirstStringValue(existingData, [
    "name",
    "person_name",
    "full_name",
    "Name",
  ]);

  const email = getFirstStringValue(existingData, ["email", "email_address", "Email"]);

  const linkedinUrl = getFirstStringValue(existingData, [
    "linkedinUrl",
    "linkedin_url",
    "linkedin",
    "LinkedIn",
    "LinkedIn URL",
  ]);

  const rawDomainOrWebsite = getFirstStringValue(existingData, [
    "domain",
    "company_domain",
    "website",
    "company_website",
  ]);

  const domain = extractDomain(rawDomainOrWebsite);

  return {
    rowId,
    tableId,
    name,
    domain,
    linkedinUrl,
    email,
    company,
    raw: existingData,
  };
}
