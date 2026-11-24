import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authenticate } from "./middleware/authenticate";
import { authorize } from "./middleware/authorize";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { consentRouter } from "./routes/consent";

export const app = express();

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
app.use("/api/auth", authRouter);
// Consent evaluation is limited to authenticated care and organization roles.
// It still evaluates synthetic request data only; it does not authorize EHR access.
app.use("/api/consent", authenticate, authorize("platform-admin", "organization-admin", "clinician", "care-coordinator", "auditor"), consentRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: "Invalid JSON request body" });
    return;
  }
  response.status(500).json({ error: "Internal server error" });
});