export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateUserData {
  readonly name: string;
  readonly email: string;
}

export interface UpdateUserData {
  readonly name?: string;
  readonly email?: string;
}
