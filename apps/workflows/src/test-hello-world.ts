#!/usr/bin/env tsx
/**
 * Test script for hello-world task
 * 
 * Usage:
 *   tsx apps/workflows/src/test-hello-world.ts
 *   tsx apps/workflows/src/test-hello-world.ts --delay 1000
 */

import { tasks } from "@trigger.dev/sdk/v3";

async function testHelloWorld() {
  const delay = process.argv.includes('--delay') 
    ? parseInt(process.argv[process.argv.indexOf('--delay') + 1]) 
    : 0;

  console.log('🧪 Testing hello-world task...');
  console.log(`⏱️  Delay: ${delay}ms\n`);

  const startTime = Date.now();

  try {
    const handle = await tasks.trigger("hello-world", {
      message: "Testing Trigger.dev performance",
      delay,
    });

    console.log(`✅ Task triggered successfully!`);
    console.log(`📋 Run ID: ${handle.id}`);
    console.log(`🔗 View in dashboard: https://cloud.trigger.dev/runs/${handle.id}\n`);

    console.log('⏳ Waiting for task to complete...\n');

    const result = await handle.poll();

    const endTime = Date.now();
    const totalWallTime = endTime - startTime;

    console.log('📊 Results:');
    console.log(`   Status: ${result.ok ? '✅ Success' : '❌ Failed'}`);
    if (result.ok) {
      console.log(`   Task execution time: ${result.output.executionTimeMs}ms`);
      console.log(`   Total wall time: ${totalWallTime}ms`);
      console.log(`   Trigger.dev overhead: ${totalWallTime - result.output.executionTimeMs}ms`);
      console.log(`   Message: ${result.output.message}`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testHelloWorld();
