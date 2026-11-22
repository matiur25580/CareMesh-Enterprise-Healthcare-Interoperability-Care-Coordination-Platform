import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createRequire } from "node:module";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { organizationsRouter } from "./routes/organizations.routes.js";

const loadPinoHttp = createRequire(import.meta.url);
const pinoHttpMiddleware = loadPinoHttp("pino-http") as typeof import("pino-http").default;

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttpMiddleware({ logger }));

app.get("/", (_req, res) => {
  res.json({ name: "CareMesh API", version: "v1", docs: "API documentation is coming in a later milestone." });
});
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/organizations", organizationsRouter);
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "The requested resource was not found." } });
});
app.use(errorHandler);
