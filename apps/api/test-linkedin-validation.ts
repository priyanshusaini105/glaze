/**
 * LinkedIn Integration Validation Tests (No API Calls)
 * Tests URL detection, field mapping, and decision logic without consuming credits
 */

import { detectLinkedInUrlType, shouldUseLinkedInProvider, mapLinkedInProfileToEnrichment, mapLinkedInCompanyToEnrichment } from './src/services/linkedin-provider';

console.log('🧪 LinkedIn Integration Validation Tests\n');
console.log('=' .repeat(60));

// Test 1: URL Detection
console.log('\n✅ Test 1: LinkedIn URL Detection');
console.log('-'.repeat(60));

const urlTests = [
  { url: 'https://www.linkedin.com/in/satyanadella', expected: 'profile' },
  { url: 'https://linkedin.com/in/bill-gates', expected: 'profile' },
  { url: 'https://www.linkedin.com/company/microsoft', expected: 'company' },
  { url: 'https://linkedin.com/company/apple', expected: 'company' },
  { url: 'https://example.com', expected: null },
  { url: 'https://twitter.com/satyanadella', expected: null },
];

let urlTestsPassed = 0;
for (const test of urlTests) {
  const result = detectLinkedInUrlType(test.url);
  const passed = result === test.expected;
  console.log(`  ${passed ? '✅' : '❌'} "${test.url}"`);
  console.log(`     Expected: ${test.expected}, Got: ${result}`);
  if (passed) urlTestsPassed++;
}
console.log(`\n📊 URL Detection: ${urlTestsPassed}/${urlTests.length} tests passed`);

// Test 2: Budget Decision Logic
console.log('\n✅ Test 2: Budget Decision Logic');
console.log('-'.repeat(60));

const budgetTests = [
  {
    name: 'Sufficient budget + gaps',
    linkedInUrl: 'https://linkedin.com/in/test',
    linkedInType: 'profile' as const,
    remainingBudget: 20,
    gaps: ['person_name', 'person_title'],
    expected: true
  },
  {
    name: 'Insufficient budget',
    linkedInUrl: 'https://linkedin.com/in/test',
    linkedInType: 'profile' as const,
    remainingBudget: 5,
    gaps: ['person_name'],
    expected: false
  },
  {
    name: 'No gaps to fill',
    linkedInUrl: 'https://linkedin.com/in/test',
    linkedInType: 'profile' as const,
    remainingBudget: 20,
    gaps: [],
    expected: false
  },
  {
    name: 'No LinkedIn URL',
    linkedInUrl: null,
    linkedInType: null,
    remainingBudget: 20,
    gaps: ['person_name'],
    expected: false
  },
];

let budgetTestsPassed = 0;
for (const test of budgetTests) {
  const result = shouldUseLinkedInProvider({
    linkedInUrl: test.linkedInUrl,
    linkedInType: test.linkedInType,
    remainingBudgetCents: test.remainingBudget,
    gaps: test.gaps as any,
  });
  const passed = result.shouldUse === test.expected;
  console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
  console.log(`     Expected: ${test.expected}, Got: ${result.shouldUse} (${result.reason})`);
  if (passed) budgetTestsPassed++;
}
console.log(`\n📊 Budget Logic: ${budgetTestsPassed}/${budgetTests.length} tests passed`);

// Test 3: Field Mapping (Profile)
console.log('\n✅ Test 3: Profile Field Mapping');
console.log('-'.repeat(60));

const sampleProfile = {
  full_name: 'Satya Nadella',
  headline: 'CEO at Microsoft',
  location: {
    city: 'Redmond',
    state: 'WA',
    country: 'United States'
  },
  profile_url: 'https://linkedin.com/in/satyanadella',
  experience: [
    {
      company: 'Microsoft',
      title: 'CEO',
      start_date: '2014-02-01',
    }
  ]
};

const profileMapping = mapLinkedInProfileToEnrichment(sampleProfile as any);
console.log('  Sample Profile Data:');
console.log(`    Name: ${sampleProfile.full_name}`);
console.log(`    Title: ${sampleProfile.headline}`);
console.log(`    Location: ${sampleProfile.location}`);
console.log(`    Company: ${sampleProfile.experience[0].company}`);

console.log('\n  Mapped Enrichment Fields:');
let profileFieldsMapped = 0;
const expectedProfileFields = ['person_name', 'person_title', 'person_location', 'person_linkedin', 'person_company', 'company_name'];
for (const field of expectedProfileFields) {
  if (profileMapping[field]) {
    console.log(`    ✅ ${field}: "${profileMapping[field].value}" (confidence: ${profileMapping[field].confidence})`);
    profileFieldsMapped++;
  } else {
    console.log(`    ❌ ${field}: Missing`);
  }
}
console.log(`\n📊 Profile Mapping: ${profileFieldsMapped}/${expectedProfileFields.length} fields mapped`);

// Test 4: Field Mapping (Company)
console.log('\n✅ Test 4: Company Field Mapping');
console.log('-'.repeat(60));

const sampleCompany = {
  company_name: 'Microsoft Corporation',
  about: 'Leading technology company',
  website: 'https://www.microsoft.com',
  location: 'Redmond, Washington',
  employee_count: 221000,
  industry: 'Computer Software',
  founded_year: 1975,
  company_url: 'https://linkedin.com/company/microsoft',
};

const companyMapping = mapLinkedInCompanyToEnrichment(sampleCompany as any);
console.log('  Sample Company Data:');
console.log(`    Name: ${sampleCompany.company_name}`);
console.log(`    Website: ${sampleCompany.website}`);
console.log(`    Employees: ${sampleCompany.employee_count}`);
console.log(`    Founded: ${sampleCompany.founded_year}`);

console.log('\n  Mapped Enrichment Fields:');
let companyFieldsMapped = 0;
const expectedCompanyFields = ['company_name', 'company_description', 'company_website', 'company_hq_location', 'company_employee_count', 'company_industry', 'company_founded_year', 'company_linkedin'];
for (const field of expectedCompanyFields) {
  if (companyMapping[field]) {
    console.log(`    ✅ ${field}: "${companyMapping[field].value}" (confidence: ${companyMapping[field].confidence})`);
    companyFieldsMapped++;
  } else {
    console.log(`    ❌ ${field}: Missing`);
  }
}
console.log(`\n📊 Company Mapping: ${companyFieldsMapped}/${expectedCompanyFields.length} fields mapped`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ URL Detection:     ${urlTestsPassed}/${urlTests.length} passed`);
console.log(`✅ Budget Logic:      ${budgetTestsPassed}/${budgetTests.length} passed`);
console.log(`✅ Profile Mapping:   ${profileFieldsMapped}/${expectedProfileFields.length} fields`);
console.log(`✅ Company Mapping:   ${companyFieldsMapped}/${expectedCompanyFields.length} fields`);

const totalTests = urlTests.length + budgetTests.length;
const totalPassed = urlTestsPassed + budgetTestsPassed;
console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} logic tests passed`);
console.log(`💰 API Credits Used: 0 (validation only)`);

if (totalPassed === totalTests && profileFieldsMapped === expectedProfileFields.length && companyFieldsMapped === expectedCompanyFields.length) {
  console.log('\n✅ All validation tests passed! Integration logic is correct.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Review the output above.');
  process.exit(1);
}
