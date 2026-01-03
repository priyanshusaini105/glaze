/**
 * Minimal LinkedIn API Test
 * Makes ONLY 1 API call to verify setup
 */

import { Effect } from 'effect';
import { LinkedInAPIService, LinkedInAPIServiceLive } from './src/services/effect-linkedin';

console.log('🔍 Minimal LinkedIn API Test (1 API call)\n');
console.log('='.repeat(60));
console.log('⚠️  This will use ~10¢ of API credits\n');

// Test with a well-known public profile
const TEST_URL = 'https://www.linkedin.com/in/williamhgates';

async function testLinkedInAPI() {
  console.log(`📡 Testing API with: ${TEST_URL}`);
  console.log('   (Bill Gates - public profile)\n');

  try {
    const program = Effect.gen(function* () {
      const api = yield* LinkedInAPIService;
      console.log('✅ LinkedIn API service initialized');
      
      console.log('📞 Making API call...');
      const profile = yield* api.getProfile(TEST_URL);
      
      return profile;
    }).pipe(Effect.provide(LinkedInAPIServiceLive));

    const result = await Effect.runPromise(program);

    console.log('\n✅ API Call Successful!\n');
    console.log('📊 Profile Data Received:');
    console.log(`   Name: ${result.full_name || 'N/A'}`);
    console.log(`   Headline: ${result.headline || 'N/A'}`);
    console.log(`   Location: ${result.location ? `${result.location.city}, ${result.location.country}` : 'N/A'}`);
    console.log(`   Profile URL: ${result.profile_url || 'N/A'}`);
    console.log(`   Connections: ${result.connections || 'N/A'}`);
    
    if (result.experience && result.experience.length > 0) {
      console.log(`\n   Current Role:`);
      console.log(`     Company: ${result.experience[0].company || 'N/A'}`);
      console.log(`     Title: ${result.experience[0].title || 'N/A'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ LinkedIn API integration is working correctly!');
    console.log('💰 API Credits Used: 1 call (~10¢)');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ API Call Failed!\n');
    console.error('Error:', error);
    console.log('\n💡 Possible Issues:');
    console.log('   1. RAPIDAPI_KEY not set in .env');
    console.log('   2. API key not subscribed to LinkedIn Data API');
    console.log('   3. Rate limit exceeded');
    console.log('   4. Network connectivity issue');
    process.exit(1);
  }
}

testLinkedInAPI();
