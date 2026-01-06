/**
 * Trigger.dev Runs Verification Script
 * 
 * Checks how many runs have been executed for each task
 */

import 'dotenv/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env from root directory
config({ path: resolve(__dirname, '../../../.env') });

import { runs, configure } from "@trigger.dev/sdk";

console.log("TRIGGER_SECRET_KEY:", process.env.TRIGGER_SECRET_KEY ? "set (starts with " + process.env.TRIGGER_SECRET_KEY.slice(0, 10) + "...)" : "NOT SET");

// Configure with your API key
configure({
    secretKey: process.env.TRIGGER_SECRET_KEY!, // tr_dev_* or tr_prod_*
});

async function getTasksAndRunsCount() {
    const taskCounts = new Map<string, number>();
    let totalRuns = 0;

    console.log("📊 Trigger.dev Runs Verification\n");
    console.log("=".repeat(50));
    console.log("\nFetching runs from Trigger.dev...\n");

    try {
        // Iterate through all runs and count
        for await (const run of runs.list({})) {
            totalRuns++;
            const taskId = run.taskIdentifier;
            taskCounts.set(taskId, (taskCounts.get(taskId) ?? 0) + 1);

            // Log first 10 runs with details
            if (totalRuns <= 10) {
                console.log(`   Run #${totalRuns}:`);
                console.log(`   - Task: ${run.taskIdentifier}`);
                console.log(`   - Status: ${run.status}`);
                console.log(`   - Created: ${run.createdAt}`);
                console.log('');
            }
        }

        const totalTasks = taskCounts.size;

        console.log("=".repeat(50));
        console.log("\n📊 Summary");
        console.log("─".repeat(40));
        console.log(`Total Tasks with runs: ${totalTasks}`);
        console.log(`Total Runs:            ${totalRuns}\n`);

        if (taskCounts.size > 0) {
            console.log("📋 Runs per Task");
            console.log("─".repeat(40));

            // Sort by run count descending
            const sorted = [...taskCounts.entries()].sort((a, b) => b[1] - a[1]);

            for (const [taskId, count] of sorted) {
                console.log(`   ${taskId.padEnd(30)} ${count} runs`);
            }
        } else {
            console.log("⚠️  No runs found. This could mean:");
            console.log("   - Trigger.dev worker is not running");
            console.log("   - Jobs were triggered but haven't been picked up");
            console.log("   - API key may not have access to runs");
            console.log("\n💡 Make sure trigger.dev dev is running:");
            console.log("   npx trigger.dev@latest dev");
        }

        console.log("\n" + "=".repeat(50));

    } catch (error) {
        console.error("❌ Error fetching runs:", error);
        console.log("\n💡 Troubleshooting:");
        console.log("   1. Check TRIGGER_SECRET_KEY is set correctly");
        console.log("   2. Ensure trigger.dev dev is running");
        console.log("   3. Verify network connectivity");
    }
}

getTasksAndRunsCount().catch(console.error);
