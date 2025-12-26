import { Effect } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { UserService } from "../application/user.service.js";
import { errorHandler } from "../middleware/error.middleware.js";

export const userRoutes = HttpRouter.empty.pipe(
  // GET /api/users - List all users
  HttpRouter.get(
    "/api/users",
    Effect.gen(function* () {
      const userService = yield* UserService;
      const users = yield* userService.getAllUsers();
      return yield* HttpServerResponse.json(users);
    }).pipe(Effect.catchAll(errorHandler))
  ),

  // GET /api/users/:id - Get user by ID
  HttpRouter.get(
    "/api/users/:id",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const id = req.url ? new URL(req.url, "http://localhost").pathname.split("/").pop() : undefined;

      if (!id) {
        return yield* HttpServerResponse.json(
          { error: "Invalid user ID" },
          { status: 400 }
        );
      }

      const userService = yield* UserService;
      const user = yield* userService.getUserById(id);

      return yield* HttpServerResponse.json(user);
    }).pipe(Effect.catchAll(errorHandler))
  ),

  // POST /api/users - Create a new user
  HttpRouter.post(
    "/api/users",
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const body = yield* request.json;

      const { name, email } = body as { name: string; email: string };

      const userService = yield* UserService;
      const user = yield* userService.createUser({ name, email });

      return yield* HttpServerResponse.json(user, { status: 201 });
    }).pipe(Effect.catchAll(errorHandler))
  ),

  // PUT /api/users/:id - Update a user
  HttpRouter.put(
    "/api/users/:id",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const id = req.url ? new URL(req.url, "http://localhost").pathname.split("/").pop() : undefined;
      const body = yield* req.json;

      const { name, email } = body as {
        name?: string;
        email?: string;
      };

      const userService = yield* UserService;
      const user = yield* userService.updateUser(id || "", { name, email });

      return yield* HttpServerResponse.json(user);
    }).pipe(Effect.catchAll(errorHandler))
  ),

  // DELETE /api/users/:id - Delete a user
  HttpRouter.del(
    "/api/users/:id",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const id = req.url ? new URL(req.url, "http://localhost").pathname.split("/").pop() : undefined;

      if (!id) {
        return yield* HttpServerResponse.json(
          { error: "Invalid user ID" },
          { status: 400 }
        );
      }

      const userService = yield* UserService;
      const result = yield* userService.deleteUser(id);

      return yield* HttpServerResponse.json(result, { status: 200 });
    }).pipe(Effect.catchAll(errorHandler))
  )
);
