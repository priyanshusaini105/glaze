import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env file
function loadEnvFromFile(): Array<{ name: string; value: string }> {
    const envVars: Array<{ name: string; value: string }> = [];
    
    // Look for .env file in the root directory
    const envPaths = [
        path.resolve(__dirname, "../../.env"),
        path.resolve(__dirname, "../.env"),
        path.resolve(__dirname, ".env"),
    ];
    
    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf-8");
            const lines = content.split("\n");
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#")) {
                    const match = trimmed.match(/^([^=]+)=(.*)$/);
                    if (match) {
                        const name = match[1].trim();
                        let value = match[2].trim();
                        // Remove quotes if present
                        if ((value.startsWith('"') && value.endsWith('"')) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        envVars.push({ name, value });
                    }
                }
            }
            break;
        }
    }
    
    return envVars;
}

export default defineConfig({
    project: "proj_xmanyodnfccgwqkmstyi",
    runtime: "node",
    logLevel: "info",
    maxDuration: 600, // Maximum task duration in seconds (10 minutes)
    retries: {
        enabledInDev: true,
        default: {
            maxAttempts: 3,
            minTimeoutInMs: 1000,
            maxTimeoutInMs: 10000,
            factor: 2,
            randomize: true,
        },
    },
    dirs: ["./src"],
    build: {
        extensions: [
            prismaExtension({
                mode: "legacy",
                schema: "../api/prisma/schema.prisma",
            }),
            // Sync environment variables during deployment
            syncEnvVars(async (ctx) => {
                console.log(`Syncing env vars for environment: ${ctx.environment}`);
                
                const envVarsToSync: Array<{ name: string; value: string }> = [];
                
                // Load from .env file
                const fileEnvVars = loadEnvFromFile();
                
                // For DATABASE_URL, prefer TRIGGER_DATABASE_URL (cloud-accessible)
                // This allows using Neon for Trigger.dev while Docker for local dev
                const triggerDbUrl = process.env.TRIGGER_DATABASE_URL || 
                    fileEnvVars.find(e => e.name === "TRIGGER_DATABASE_URL")?.value;
                
                const dbUrl = triggerDbUrl || 
                    process.env.DATABASE_URL || 
                    fileEnvVars.find(e => e.name === "DATABASE_URL")?.value;
                
                if (dbUrl) {
                    envVarsToSync.push({ name: "DATABASE_URL", value: dbUrl });
                }
                
                // Sync RAPIDAPI_KEY
                const rapidApiKey = process.env.RAPIDAPI_KEY || 
                    fileEnvVars.find(e => e.name === "RAPIDAPI_KEY")?.value;
                
                if (rapidApiKey) {
                    envVarsToSync.push({ name: "RAPIDAPI_KEY", value: rapidApiKey });
                }
                
                console.log(`Found ${envVarsToSync.length} env vars to sync:`, 
                    envVarsToSync.map(e => e.name));
                
                return envVarsToSync;
            }),
        ],
    },
});
