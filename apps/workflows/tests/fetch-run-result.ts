/**
 * Fetch workflow run result from Trigger.dev API
 *
 * Run with: npx tsx tests/fetch-run-result.ts <run_id>
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../../.env") });

async function main() {
    const runId = process.argv[2] || "run_cmk2xxo7ph8tl2zn4itcsl0g1";

    console.log("🔍 Fetching run result for:", runId);

    const response = await fetch(`https://api.trigger.dev/api/v1/runs/${runId}`, {
        headers: {
            Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
        },
    });

    if (!response.ok) {
        console.error("❌ Failed to fetch:", response.status, response.statusText);
        const text = await response.text();
        console.error(text);
        process.exit(1);
    }

    const data = await response.json();
    console.log("\n📊 Run Details:");
    console.log(JSON.stringify(data, null, 2));
}

main();
