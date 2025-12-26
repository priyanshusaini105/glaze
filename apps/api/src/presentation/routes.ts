import { Effect } from "effect";
import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { userRoutes } from "./user.routes.js";

// Health check route
const healthRoutes = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/health",
    Effect.gen(function* () {
      return yield* HttpServerResponse.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    })
  ),
  HttpRouter.get(
    "/",
    Effect.gen(function* () {
      return yield* HttpServerResponse.json({
        message: "Welcome to Glaze API! Built with Effect-ts",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        endpoints: {
          health: "GET /health",
          users: {
            list: "GET /api/users",
            get: "GET /api/users/:id",
            create: "POST /api/users",
            update: "PUT /api/users/:id",
            delete: "DELETE /api/users/:id",
          },
        },
      });
    })
  )
);

// Combine all routes
export const router = HttpRouter.empty.pipe(
  HttpRouter.concat(healthRoutes),
  HttpRouter.concat(userRoutes)
);
