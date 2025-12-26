import { Data } from "effect";

export class AppError extends Data.TaggedError("AppError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
  readonly resourceId?: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly field?: string;
}> {}

export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly message: string;
  readonly field?: string;
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string;
}> {}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string;
}> {}
