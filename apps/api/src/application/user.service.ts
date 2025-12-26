import { Context } from "effect";
import type { CreateUserData, UpdateUserData } from "../domain/user.model.js";

export interface IUserService {
  readonly getUserById: (id: string) => any;
  readonly getAllUsers: () => any;
  readonly createUser: (data: CreateUserData) => any;
  readonly updateUser: (id: string, data: UpdateUserData) => any;
  readonly deleteUser: (id: string) => any;
}

export class UserService extends Context.Tag("UserService")<
  UserService,
  IUserService
>() {}
