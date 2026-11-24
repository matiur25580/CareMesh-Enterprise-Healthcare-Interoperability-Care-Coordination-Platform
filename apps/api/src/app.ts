import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { consentRouter } from "./routes/consent";

export const app = express();

// CareMesh starts with restrictive defaults. Configure trusted origins explicitly
// at deployment time rather than reflecting arbitrary browser origins.
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? false }));
app.use(express.json({ limit: "1mb", strict: true }));

app.get("/", (_request, response) => {
  response.status(200).json({
    name: "CareMesh API",
    status: "foundation",
    notice: "Development foundation only; not for clinical use or real patient data."
  });
});

app.use("/api/health", healthRouter);
app.use("/api/consent", consentRouter);

// Do not echo request bodies or sensitive values from unexpected errors.
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: "Invalid JSON request body" });
    return;
  }

  response.status(500).json({ error: "Internal server error" });
});