/**
 * Test direct Trigger.dev task triggering
 */

import 'dotenv/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env from root directory
config({ path: resolve(__dirname, '../../../.env') });

import { tasks } from "@trigger.dev/sdk";

console.log("TRIGGER_SECRET_KEY:", process.env.TRIGGER_SECRET_KEY ? "set" : "NOT SET");

async function testTrigger() {
    console.log("Attempting to trigger process-enrichment-job task...\n");

    try {
        const result = await tasks.trigger("process-enrichment-job", {
            jobId: "test-job-id",
            tableId: "test-table-id",
            taskIds: ["task-1", "task-2"]
        });

        console.log("✅ Task triggered successfully!");
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Failed to trigger task:");
        console.error(error);
    }
}

testTrigger();
