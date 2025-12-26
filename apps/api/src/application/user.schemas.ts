import { Schema } from "@effect/schema";

export class CreateUserRequestSchema extends Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Name is required" }),
    Schema.maxLength(100, { message: () => "Name is too long" })
  ),
  email: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Email is required" }),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "Invalid email format",
    })
  ),
}) {}

export class UpdateUserRequestSchema extends Schema.Struct({
  name: Schema.optional(
    Schema.String.pipe(
      Schema.minLength(1, { message: () => "Name cannot be empty" }),
      Schema.maxLength(100, { message: () => "Name is too long" })
    )
  ),
  email: Schema.optional(
    Schema.String.pipe(
      Schema.minLength(1, { message: () => "Email cannot be empty" }),
      Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
        message: () => "Invalid email format",
      })
    )
  ),
}) {}

export class UserResponseSchema extends Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}
