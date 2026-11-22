import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./db/connect.js";

let server: ReturnType<typeof app.listen> | undefined;

async function start(): Promise<void> {
  await connectDatabase(env.MONGODB_URI);
  server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "CareMesh API listening"));
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown requested");
  if (server) await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
start().catch((error: unknown) => {
  logger.fatal({ err: error }, "API startup failed");
  process.exit(1);
});
