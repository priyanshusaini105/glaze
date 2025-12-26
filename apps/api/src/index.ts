import { Layer, Effect } from "effect";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { HttpMiddleware, HttpServer } from "@effect/platform";
import { createServer } from "node:http";
import { router } from "./presentation/routes.js";
import { InMemoryUserRepository } from "./infrastructure/user.repository.impl.js";
import { UserServiceLive } from "./application/user.service.impl.js";

console.log("🚀 Starting Glaze API server with Effect-ts");
console.log("📍 Server running at http://localhost:3001");
console.log("\n📚 Available endpoints:");
console.log("   GET    /                  - API information");
console.log("   GET    /health            - Health check");
console.log("   GET    /api/users         - List all users");
console.log("   GET    /api/users/:id     - Get user by ID");
console.log("   POST   /api/users         - Create a new user");
console.log("   PUT    /api/users/:id     - Update a user");
console.log("   DELETE /api/users/:id     - Delete a user");
console.log("\n✨ Ready to receive requests!\n");

// Create server layer
const ServerLive = NodeHttpServer.layer(createServer, { port: 3001 });

// Application layer - compose all dependencies
const AppLayer = Layer.mergeAll(
  InMemoryUserRepository,
  UserServiceLive
);

// Serve the router with middleware
const HttpLive = router.pipe(
  HttpServer.serve(HttpMiddleware.logger),
  Layer.provide(AppLayer),
  Layer.provide(ServerLive)
);

// Run the application
const main = Effect.scoped(Layer.launch(HttpLive) as any);
Effect.runPromise(main as any).catch((e) => {
  console.error("Server error:", e);
  process.exit(1);
});
