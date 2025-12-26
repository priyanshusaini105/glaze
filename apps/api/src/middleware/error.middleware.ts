import { Effect } from "effect";
import { HttpServerResponse } from "@effect/platform";
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from "../errors/app.errors.js";

interface ErrorResponse {
  error: string;
  message: string;
  field?: string;
  resourceId?: string;
}

export const errorHandler = (error: unknown): Effect.Effect<HttpServerResponse.HttpServerResponse, unknown, never> =>
  Effect.gen(function* () {
    console.error("Error occurred:", error);

    // Handle custom errors
    if (error instanceof NotFoundError) {
      return yield* HttpServerResponse.json(
        {
          error: "NOT_FOUND",
          message: error.message,
          resourceId: error.resourceId,
        } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    if (error instanceof ValidationError) {
      return yield* HttpServerResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: error.message,
          field: error.field,
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (error instanceof ConflictError) {
      return yield* HttpServerResponse.json(
        {
          error: "CONFLICT",
          message: error.message,
          field: error.field,
        } satisfies ErrorResponse,
        { status: 409 }
      );
    }

    if (error instanceof UnauthorizedError) {
      return yield* HttpServerResponse.json(
        {
          error: "UNAUTHORIZED",
          message: error.message,
        } satisfies ErrorResponse,
        { status: 401 }
      );
    }

    if (error instanceof ForbiddenError) {
      return yield* HttpServerResponse.json(
        {
          error: "FORBIDDEN",
          message: error.message,
        } satisfies ErrorResponse,
        { status: 403 }
      );
    }

    if (error instanceof AppError) {
      return yield* HttpServerResponse.json(
        {
          error: "APPLICATION_ERROR",
          message: error.message,
        } satisfies ErrorResponse,
        { status: 500 }
      );
    }

    // Handle unknown errors
    return yield* HttpServerResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      } satisfies ErrorResponse,
      { status: 500 }
    );
  });

export const corsMiddleware = HttpServerResponse.setHeaders({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});
