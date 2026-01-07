/**
 * Test script for Multi-Agent Enrichment Workflow (with result waiting)
 *
 * Run with: npx tsx tests/test-multi-agent-full.ts
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root
config({ path: resolve(__dirname, "../../.env") });

import { tasks } from "@trigger.dev/sdk/v3";

async function main() {
    console.log("🧪 Testing Multi-Agent Enrichment Workflow (Full)\n");

    if (!process.env.TRIGGER_SECRET_KEY) {
        console.error("❌ TRIGGER_SECRET_KEY not found in environment");
        process.exit(1);
    }

    const testPayload = {
        rowId: "test-row-" + Date.now(),
        tableId: "test-table-001",
        inputData: {
            name: "Jane Doe",
            company: "TechCorp Solutions",
            domain: "techcorp.io",
            email: "jane@techcorp.io",
        },
        fieldsToEnrich: [
            "name",
            "company",
            "emailCandidates",
            "title",
            "location",
            "shortBio",
        ],
        budgetCents: 100,
    };

    console.log("📋 Test Payload:");
    console.log(JSON.stringify(testPayload, null, 2));
    console.log("\n🚀 Triggering workflow and waiting for result...\n");

    try {
        const startTime = Date.now();
        const result = await tasks.triggerAndWait("multi-agent-enrichment", testPayload);
        const duration = Date.now() - startTime;

        console.log("🎉 Workflow Complete!\n");
        console.log("⏱️  Total Duration:", duration, "ms");
        console.log("✅ Run OK:", result.ok);

        if (result.ok) {
            console.log("\n📊 Results:");
            console.log(JSON.stringify(result.output, null, 2));
        } else {
            console.log("\n❌ Error:", result.error);
        }
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

main();
