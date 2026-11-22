import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { organizationsRouter } from "./routes/organizations.routes.js";
import { patientsRouter } from "./routes/patients.routes.js";
import { fhirRouter } from "./routes/fhir.routes.js";
import { fhirObservationsRouter } from "./routes/fhir-observations.routes.js";
import { fhirConditionsRouter } from "./routes/fhir-conditions.routes.js";
import { careGapsRouter } from "./routes/care-gaps.routes.js";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use((pinoHttp as unknown as (options: { logger: typeof logger }) => RequestHandler)({ logger }));

app.get("/", (_req, res) => {
  res.json({ name: "CareMesh API", version: "v1", docs: "API documentation is coming in a later milestone." });
});
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/organizations", organizationsRouter);
app.use("/api/v1/patients", patientsRouter);
app.use("/api/v1/care-gaps", careGapsRouter);
app.use("/api/v1/fhir/R4", fhirRouter);
app.use("/api/v1/fhir/R4", fhirObservationsRouter);
app.use("/api/v1/fhir/R4", fhirConditionsRouter);
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "The requested resource was not found." } });
});
app.use(errorHandler);
