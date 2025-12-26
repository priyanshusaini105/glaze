# API

A scalable backend built with [Effect-ts](https://effect.website/), following clean architecture principles and domain-driven design patterns.

## Architecture

The project follows a layered architecture with clear separation of concerns:

```
src/
├── config/           # Configuration management
│   └── server.config.ts
├── domain/           # Business entities and interfaces
│   ├── user.model.ts
│   └── user.repository.ts
├── application/      # Business logic and use cases
│   ├── user.service.ts
│   └── user.schemas.ts
├── infrastructure/   # External services and implementations
│   └── user.repository.impl.ts
├── presentation/     # HTTP layer (routes, controllers)
│   ├── routes.ts
│   └── user.routes.ts
├── middleware/       # HTTP middleware
│   └── error.middleware.ts
├── errors/          # Custom error definitions
│   └── app.errors.ts
└── index.ts         # Application entry point
```

### Layer Responsibilities

**Domain Layer** (`domain/`)
- Pure business entities and interfaces
- No dependencies on external libraries
- Defines contracts (repositories, services)

**Application Layer** (`application/`)
- Business logic and use cases
- Orchestrates domain objects
- Schema validation
- Independent of HTTP concerns

**Infrastructure Layer** (`infrastructure/`)
- Implements domain interfaces
- External service integrations
- Database/storage implementations
- Currently uses in-memory storage

**Presentation Layer** (`presentation/`)
- HTTP routes and handlers
- Request/response transformation
- Thin layer that delegates to application services

**Middleware** (`middleware/`)
- Cross-cutting concerns (logging, errors, CORS)
- Request/response interceptors

## Key Features

✅ **Effect-ts Dependency Injection** - Type-safe service composition using Effect Layers  
✅ **Repository Pattern** - Abstract data access with swappable implementations  
✅ **Custom Error Handling** - Domain-specific errors with proper HTTP mapping  
✅ **Clean Architecture** - Separation of concerns with clear boundaries  
✅ **Type Safety** - End-to-end type safety with Effect and TypeScript  
✅ **Middleware System** - Composable request/response processing  
✅ **Configuration Management** - Environment-based config with Effect Config  

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Development

```bash
pnpm run dev
```

### Build

```bash
pnpm run build
```

### Start Production Server

```bash
pnpm run start
```

## API Endpoints

### Health Check
- `GET /` - API information
- `GET /health` - Health status

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```
- `PUT /api/users/:id` - Update a user
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
  ```
- `DELETE /api/users/:id` - Delete a user

## Error Handling

The API uses custom error types that map to appropriate HTTP status codes:

- `ValidationError` → 400 Bad Request
- `NotFoundError` → 404 Not Found
- `ConflictError` → 409 Conflict
- `UnauthorizedError` → 401 Unauthorized
- `ForbiddenError` → 403 Forbidden
- `AppError` → 500 Internal Server Error

## Adding New Features

### 1. Add a new entity

Create model in `domain/`:
```typescript
// domain/post.model.ts
export interface Post {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}
```

### 2. Define repository interface

```typescript
// domain/post.repository.ts
export class PostRepository extends Effect.Service<PostRepository>()(
  "PostRepository",
  { /* methods */ }
) {}
```

### 3. Implement repository

```typescript
// infrastructure/post.repository.impl.ts
export const InMemoryPostRepository = Layer.effect(
  PostRepository,
  /* implementation */
);
```

### 4. Create service

```typescript
// application/post.service.ts
export class PostService extends Effect.Service<PostService>()(
  "PostService",
  { /* business logic */ }
) {}
```

### 5. Add routes

```typescript
// presentation/post.routes.ts
export const postRoutes = HttpRouter.empty.pipe(
  HttpRouter.get("/api/posts", /* handler */),
  // more routes...
);
```

### 6. Register in main router

```typescript
// presentation/routes.ts
export const router = HttpRouter.empty.pipe(
  HttpRouter.concat(healthRoutes),
  HttpRouter.concat(userRoutes),
  HttpRouter.concat(postRoutes) // Add here
);
```

## Next Steps

- [ ] Add database integration (PostgreSQL, MongoDB, etc.)
- [ ] Implement authentication & authorization
- [ ] Add request validation using @effect/schema
- [ ] Implement caching layer
- [ ] Add rate limiting
- [ ] Set up logging service
- [ ] Add OpenAPI/Swagger documentation
- [ ] Implement pagination
- [ ] Add unit and integration tests
- [ ] Set up CI/CD pipeline

## Technologies

- **Effect-ts** - Functional effect system
- **@effect/platform** - HTTP server abstraction
- **@effect/platform-node** - Node.js runtime
- **@effect/schema** - Schema validation
- **TypeScript** - Type safety
- **Node.js** - Runtime environment
