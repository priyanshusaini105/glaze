/**
 * Worker Application Entry Point
 * 
 * Starts the background enrichment worker process
 */

import { startWorker, stopWorker } from "./service";

const main = async () => {
  console.log("[worker] Starting enrichment worker...");

  const worker = await startWorker();

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("[worker] SIGTERM received, shutting down...");
    await stopWorker(worker);
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[worker] SIGINT received, shutting down...");
    await stopWorker(worker);
    process.exit(0);
  });
};

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
