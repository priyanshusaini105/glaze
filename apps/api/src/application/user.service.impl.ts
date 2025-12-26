import { Layer, Effect } from "effect";
import type { CreateUserData, UpdateUserData } from "../domain/user.model.js";
import { UserRepository } from "../domain/user.repository.js";
import { UserService, type IUserService } from "./user.service.js";
import { NotFoundError, ValidationError } from "../errors/app.errors.js";

export const UserServiceLive = Layer.effect(
  UserService,
  Effect.gen(function* () {
    const repository = yield* UserRepository;

    const service: IUserService = {
      getUserById: (id: string) =>
        Effect.gen(function* () {
          const user = yield* repository.findById(id);
          if (!user) {
            return yield* Effect.fail(
              new NotFoundError({
                message: `User with id ${id} not found`,
                resourceId: id,
              })
            );
          }
          return user;
        }),

      getAllUsers: () => repository.findAll(),

      createUser: (data: CreateUserData) =>
        Effect.gen(function* () {
          // Validate email
          if (!data.email || !data.email.includes("@")) {
            return yield* Effect.fail(
              new ValidationError({
                message: "Invalid email format",
                field: "email",
              })
            );
          }

          // Check for duplicate email
          const existing = yield* repository.findByEmail(data.email);
          if (existing) {
            return yield* Effect.fail(
              new NotFoundError({
                message: "Email already exists",
                resourceId: data.email,
              })
            );
          }

          return yield* repository.create(data);
        }),

      updateUser: (id: string, data: UpdateUserData) =>
        Effect.gen(function* () {
          const user = yield* repository.update(id, data);
          if (!user) {
            return yield* Effect.fail(
              new NotFoundError({
                message: `User with id ${id} not found`,
                resourceId: id,
              })
            );
          }
          return user;
        }),

      deleteUser: (id: string) => repository.delete(id),
    };

    return service;
  })
);
