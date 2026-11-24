import { app } from "./app";
import { connectDatabase } from "./config/database";

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

async function start(): Promise<void> {
  // Database connectivity is optional for the initial synthetic-data demo.
  // Never add real patient workflows until auth, tenant isolation, consent
  // provenance, and audit controls are enforced by the service layer.
  await connectDatabase();
  app.listen(port, host, () => {
    console.info(`CareMesh API listening on ${host}:${port}`);
  });
}

void start().catch((error: unknown) => {
  console.error("CareMesh API startup failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});