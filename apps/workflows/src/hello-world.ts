/**
 * Hello World Test Task
 * 
 * Simple test task to measure baseline Trigger.dev overhead
 * and verify the platform is working correctly.
 */

import { logger, task } from "@trigger.dev/sdk";

export interface HelloWorldPayload {
  message?: string;
  delay?: number; // Optional delay in ms to simulate work
}

export const helloWorldTask = task({
  id: "hello-world",
  maxDuration: 60,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: HelloWorldPayload = {}) => {
    const startTime = Date.now();
    const { message = "Hello, World!", delay = 0 } = payload;

    logger.info("🚀 Hello World task started", { 
      startTime: new Date(startTime).toISOString(),
      message,
      delay 
    });

    // Simulate some work if delay is specified
    if (delay > 0) {
      logger.info(`⏳ Simulating work for ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      logger.info("✅ Work simulation completed");
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    logger.info("🏁 Hello World task completed", {
      endTime: new Date(endTime).toISOString(),
      totalTimeMs: totalTime,
      message,
    });

    return {
      success: true,
      message,
      executionTimeMs: totalTime,
      timestamp: new Date().toISOString(),
    };
  },
});
