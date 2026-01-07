/**
 * Test script for Multi-Agent Enrichment Workflow
 *
 * Run with: npx tsx tests/test-multi-agent.ts
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
    console.log("🧪 Testing Multi-Agent Enrichment Workflow\n");

    if (!process.env.TRIGGER_SECRET_KEY) {
        console.error("❌ TRIGGER_SECRET_KEY not found in environment");
        console.log("Make sure .env file exists with TRIGGER_SECRET_KEY set");
        process.exit(1);
    }

    console.log("✅ TRIGGER_SECRET_KEY found");

    const testPayload = {
        rowId: "test-row-" + Date.now(),
        tableId: "test-table-001",
        inputData: {
            name: "John Smith",
            company: "Acme Technologies",
            domain: "acme.tech",
            email: "john@acme.tech",
            linkedinUrl: "https://linkedin.com/in/johnsmith",
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
    console.log("\n🚀 Triggering workflow...\n");

    try {
        const handle = await tasks.trigger("multi-agent-enrichment", testPayload);
        console.log("✅ Workflow triggered!");
        console.log("   Run ID:", handle.id);
        console.log("   Dashboard: https://cloud.trigger.dev/runs/" + handle.id);
        console.log("\n⏳ Check status with 'npx trigger.dev@latest runs list'\n");
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

main();
