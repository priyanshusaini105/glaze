import { Effect, Layer, Ref } from "effect";
import type { User, CreateUserData, UpdateUserData } from "../domain/user.model.js";
import { UserRepository, type IUserRepository } from "../domain/user.repository.js";
import { ConflictError } from "../errors/app.errors.js";

let userIdCounter = 1;

export const InMemoryUserRepository = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const usersRef = yield* Ref.make<User[]>([]);

    const repo: IUserRepository = {
      findById: (id: string) =>
        Effect.gen(function* () {
          const users = yield* Ref.get(usersRef);
          return users.find((u) => u.id === id) || null;
        }),

      findByEmail: (email: string) =>
        Effect.gen(function* () {
          const users = yield* Ref.get(usersRef);
          return users.find((u) => u.email === email) || null;
        }),

      findAll: () => Ref.get(usersRef),

      create: (data: CreateUserData) =>
        Effect.gen(function* () {
          // Check if email already exists
          const existingUser = yield* Ref.get(usersRef).pipe(
            Effect.map((users) => users.find((u) => u.email === data.email))
          );

          if (existingUser) {
            return yield* Effect.fail(
              new ConflictError({
                message: "User with this email already exists",
                field: "email",
              })
            );
          }

          const now = new Date();
          const newUser: User = {
            id: `user_${userIdCounter++}`,
            name: data.name,
            email: data.email,
            createdAt: now,
            updatedAt: now,
          };

          yield* Ref.update(usersRef, (users) => [...users, newUser]);
          return newUser;
        }),

      update: (id: string, data: UpdateUserData) =>
        Effect.gen(function* () {
          const users = yield* Ref.get(usersRef);
          const userIndex = users.findIndex((u) => u.id === id);

          if (userIndex === -1) {
            return null;
          }

          // Check if email already exists for another user
          if (data.email) {
            const existingUser = users.find(
              (u) => u.email === data.email && u.id !== id
            );
            if (existingUser) {
              return yield* Effect.fail(
                new ConflictError({
                  message: "Email already in use",
                  field: "email",
                })
              );
            }
          }

          const updatedUser: User = {
            id: users[userIndex]?.id || "",
            name: data.name ?? (users[userIndex]?.name || ""),
            email: data.email ?? (users[userIndex]?.email || ""),
            createdAt: users[userIndex]?.createdAt || new Date(),
            updatedAt: new Date(),
          };

          yield* Ref.update(usersRef, (prevUsers) =>
            prevUsers.map((u, i) => (i === userIndex ? updatedUser : u))
          );

          return updatedUser;
        }),

      delete: (id: string) =>
        Effect.gen(function* () {
          const users = yield* Ref.get(usersRef);
          const userExists = users.some((u) => u.id === id);

          if (!userExists) {
            return false;
          }

          yield* Ref.update(usersRef, (prevUsers) =>
            prevUsers.filter((u) => u.id !== id)
          );

          return true;
        }),
    };

    return repo;
  })
);
