import { Context, Effect } from "effect";
import type { User, CreateUserData, UpdateUserData } from "./user.model.js";

export interface IUserRepository {
  readonly findById: (id: string) => Effect.Effect<User | null, never>;
  readonly findByEmail: (email: string) => Effect.Effect<User | null, never>;
  readonly findAll: () => Effect.Effect<readonly User[], never>;
  readonly create: (data: CreateUserData) => Effect.Effect<User, unknown>;
  readonly update: (
    id: string,
    data: UpdateUserData
  ) => Effect.Effect<User | null, unknown>;
  readonly delete: (id: string) => Effect.Effect<boolean, never>;
}

export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  IUserRepository
>() {}
