import { Config, Effect } from "effect";

export interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly environment: "development" | "production" | "test";
  readonly logLevel: "debug" | "info" | "warn" | "error";
}

export class ServerConfigService extends Effect.Service<ServerConfigService>()(
  "ServerConfigService",
  {
    effect: Effect.gen(function* () {
      const port = yield* Config.number("PORT").pipe(
        Config.withDefault(3001)
      );
      const host = yield* Config.string("HOST").pipe(
        Config.withDefault("localhost")
      );
      const environment = yield* Config.string("NODE_ENV").pipe(
        Config.withDefault("development"),
        Config.validate({
          message: "Invalid environment",
          validation: (value) =>
            ["development", "production", "test"].includes(value),
        })
      );
      const logLevel = yield* Config.string("LOG_LEVEL").pipe(
        Config.withDefault("info"),
        Config.validate({
          message: "Invalid log level",
          validation: (value) =>
            ["debug", "info", "warn", "error"].includes(value),
        })
      );

      return {
        port,
        host,
        environment: environment as ServerConfig["environment"],
        logLevel: logLevel as ServerConfig["logLevel"],
      } satisfies ServerConfig;
    }),
  }
) {}
