/**
 * LinkedIn Enrichment Integration Examples
 * 
 * Demonstrates end-to-end enrichment using LinkedIn API in the waterfall pipeline
 */

import { Effect } from 'effect';
import {
  LinkedInProfileProvider,
  LinkedInCompanyProvider,
  mapLinkedInProfileToEnrichment,
  mapLinkedInCompanyToEnrichment,
  detectLinkedInUrlType,
  shouldUseLinkedInProvider,
} from '../services/linkedin-provider';
import type { EnrichmentData } from '../types/enrichment';

// ========== Example 1: Direct Provider Usage ==========

export const exampleDirectProfileEnrichment = async () => {
  console.log('\n=== Example 1: Direct LinkedIn Profile Enrichment ===\n');

  const profileUrl = 'https://www.linkedin.com/in/satyanadella';

  try {
    const enrichmentEffect = LinkedInProfileProvider.lookup(profileUrl);
    const data = await Effect.runPromise(enrichmentEffect);

    console.log('✅ Profile enriched successfully:');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nCost: ${LinkedInProfileProvider.costCents}¢`);
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
  }
};

export const exampleDirectCompanyEnrichment = async () => {
  console.log('\n=== Example 2: Direct LinkedIn Company Enrichment ===\n');

  const companyUrl = 'https://www.linkedin.com/company/microsoft';

  try {
    const enrichmentEffect = LinkedInCompanyProvider.lookup(companyUrl);
    const data = await Effect.runPromise(enrichmentEffect);

    console.log('✅ Company enriched successfully:');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nCost: ${LinkedInCompanyProvider.costCents}¢`);
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
  }
};

// ========== Example 2: URL Detection ==========

export const exampleUrlDetection = () => {
  console.log('\n=== Example 3: LinkedIn URL Detection ===\n');

  const testUrls = [
    'https://www.linkedin.com/in/satyanadella',
    'https://www.linkedin.com/company/microsoft',
    'https://microsoft.com',
    'https://linkedin.com/in/john-doe/',
    'https://www.example.com',
  ];

  testUrls.forEach((url) => {
    const type = detectLinkedInUrlType(url);
    console.log(`${url}`);
    console.log(`  → Type: ${type || 'Not LinkedIn'}\n`);
  });
};

// ========== Example 3: Budget Decision Logic ==========

export const exampleBudgetDecision = () => {
  console.log('\n=== Example 4: LinkedIn Budget Decision ===\n');

  const scenarios = [
    {
      name: 'Sufficient budget, relevant gaps',
      gaps: ['person_name', 'person_title', 'company_name'],
      budget: 50,
      linkedInUrl: 'https://www.linkedin.com/in/satyanadella',
      linkedInType: 'profile' as const,
    },
    {
      name: 'Insufficient budget',
      gaps: ['person_name', 'person_title'],
      budget: 5,
      linkedInUrl: 'https://www.linkedin.com/in/satyanadella',
      linkedInType: 'profile' as const,
    },
    {
      name: 'No LinkedIn URL',
      gaps: ['company_name', 'company_description'],
      budget: 50,
      linkedInUrl: null,
      linkedInType: null,
    },
    {
      name: 'No relevant gaps',
      gaps: ['company_phone', 'company_email'],
      budget: 50,
      linkedInUrl: 'https://www.linkedin.com/company/microsoft',
      linkedInType: 'company' as const,
    },
  ];

  scenarios.forEach((scenario) => {
    const decision = shouldUseLinkedInProvider({
      gaps: scenario.gaps as any,
      remainingBudgetCents: scenario.budget,
      linkedInUrl: scenario.linkedInUrl,
      linkedInType: scenario.linkedInType,
    });

    console.log(`\n${scenario.name}:`);
    console.log(`  Gaps: ${scenario.gaps.join(', ')}`);
    console.log(`  Budget: ${scenario.budget}¢`);
    console.log(`  LinkedIn URL: ${scenario.linkedInUrl || 'None'}`);
    console.log(`  → Decision: ${decision.shouldUse ? '✅ USE' : '❌ SKIP'}`);
    console.log(`  → Reason: ${decision.reason}`);
  });
};

// ========== Example 4: Waterfall Simulation ==========

export const exampleWaterfallSimulation = async () => {
  console.log('\n=== Example 5: Waterfall Enrichment Simulation ===\n');

  const input = {
    url: 'https://www.linkedin.com/in/satyanadella',
    requiredFields: [
      'person_name',
      'person_title',
      'person_location',
      'person_company',
      'company_name',
    ],
    budget: 50,
  };

  console.log('Input:', input);
  console.log('\n--- Starting Waterfall Pipeline ---\n');

  // Simulate enrichment stages
  let enrichmentData: EnrichmentData = {};
  let remainingBudget = input.budget;
  let totalCost = 0;

  // Stage 1: Cache (Free) - Simulate no cache hit
  console.log('1️⃣ Cache Stage (0¢)');
  console.log('  → Cache miss\n');

  // Stage 2: Free Layer - Website scraping (Skip for LinkedIn profile)
  console.log('2️⃣ Free Layer - Website Scraping (0¢)');
  console.log('  → Skipped (LinkedIn profile, not website)\n');

  // Stage 3: Cheap Layer - Search (Simulate partial result)
  console.log('3️⃣ Cheap Layer - Search API (1¢)');
  const searchData: EnrichmentData = {
    company_name: {
      value: 'Microsoft',
      confidence: 70,
      source: 'search_result',
      timestamp: new Date().toISOString(),
    },
  };
  enrichmentData = { ...enrichmentData, ...searchData };
  totalCost += 1;
  remainingBudget -= 1;
  console.log('  → Found: company_name');
  console.log(`  → Cost: 1¢, Remaining: ${remainingBudget}¢\n`);

  // Stage 4: Premium Layer - LinkedIn API
  console.log('4️⃣ Premium Layer - LinkedIn API');
  
  const gaps = input.requiredFields.filter(
    (field) => !enrichmentData[field as keyof EnrichmentData]
  );
  
  console.log(`  → Gaps: ${gaps.join(', ')}`);
  console.log(`  → Budget: ${remainingBudget}¢`);

  const decision = shouldUseLinkedInProvider({
    gaps: gaps as any,
    remainingBudgetCents: remainingBudget,
    linkedInUrl: input.url,
    linkedInType: 'profile',
  });

  if (decision.shouldUse) {
    console.log(`  → ${decision.reason}`);
    console.log('  → Calling LinkedIn API...\n');

    try {
      const enrichmentEffect = LinkedInProfileProvider.lookup(input.url);
      const linkedInData = await Effect.runPromise(enrichmentEffect);
      
      enrichmentData = { ...enrichmentData, ...linkedInData };
      totalCost += LinkedInProfileProvider.costCents;
      remainingBudget -= LinkedInProfileProvider.costCents;

      console.log('  ✅ LinkedIn enrichment successful');
      console.log(`  → Fields: ${Object.keys(linkedInData).join(', ')}`);
      console.log(`  → Cost: ${LinkedInProfileProvider.costCents}¢, Remaining: ${remainingBudget}¢\n`);
    } catch (error) {
      console.error('  ❌ LinkedIn API failed:', error);
    }
  } else {
    console.log(`  → Skipped: ${decision.reason}\n`);
  }

  // Final analysis
  console.log('--- Pipeline Complete ---\n');
  console.log('Final Results:');
  console.log(`  Total Cost: ${totalCost}¢`);
  console.log(`  Remaining Budget: ${remainingBudget}¢`);
  console.log(`  Fields Enriched: ${Object.keys(enrichmentData).length}/${input.requiredFields.length}`);
  
  const finalGaps = input.requiredFields.filter(
    (field) => !enrichmentData[field as keyof EnrichmentData]
  );
  
  if (finalGaps.length === 0) {
    console.log('  ✅ All required fields filled!');
  } else {
    console.log(`  ⚠️  Remaining gaps: ${finalGaps.join(', ')}`);
  }

  console.log('\nEnriched Data:');
  console.log(JSON.stringify(enrichmentData, null, 2));
};

// ========== Example 5: Company Enrichment Flow ==========

export const exampleCompanyEnrichment = async () => {
  console.log('\n=== Example 6: Company Enrichment via LinkedIn ===\n');

  const companyUrl = 'https://www.linkedin.com/company/microsoft';

  console.log('Scenario: Enrich company from LinkedIn company page');
  console.log(`URL: ${companyUrl}\n`);

  try {
    const enrichmentEffect = LinkedInCompanyProvider.lookup(companyUrl);
    const data = await Effect.runPromise(enrichmentEffect);

    console.log('✅ Enrichment successful!\n');
    console.log('Fields enriched:');
    Object.entries(data).forEach(([field, value]: [string, any]) => {
      console.log(`  ${field}: ${value.value} (confidence: ${value.confidence})`);
    });

    console.log(`\nCost: ${LinkedInCompanyProvider.costCents}¢`);
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
  }
};

// ========== Main Runner ==========

export const runLinkedInEnrichmentExamples = async () => {
  console.log('\n🚀 LinkedIn Enrichment Integration Examples\n');
  console.log('='.repeat(60));

  try {
    // Example 1 & 2: Direct enrichment
    await exampleDirectProfileEnrichment();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await exampleDirectCompanyEnrichment();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Example 3: URL detection
    exampleUrlDetection();

    // Example 4: Budget decisions
    exampleBudgetDecision();

    // Example 5: Waterfall simulation
    await exampleWaterfallSimulation();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Example 6: Company enrichment
    await exampleCompanyEnrichment();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed!\n');
  } catch (error) {
    console.error('\n❌ Examples failed:', error);
  }
};

// Run if executed directly
if (import.meta.main) {
  runLinkedInEnrichmentExamples().catch(console.error);
}
