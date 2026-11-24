import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { authenticate } from "./middleware/authenticate";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { consentRouter } from "./routes/consent";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? false }));
app.use(express.json({ limit: "1mb", strict: true }));
const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false });

app.use("/api/v1/health", apiLimiter, healthRouter);
app.use("/api/v1/auth", apiLimiter, authRouter);
app.use("/api/v1/consent", apiLimiter, authenticate, consentRouter);

// Keep unversioned aliases for local compatibility.
app.use("/api/health", apiLimiter, healthRouter);
app.use("/api/auth", apiLimiter, authRouter);
app.use("/api/consent", apiLimiter, authenticate, consentRouter);
app.use("/api", (_request, response) => response.status(404).json({
  error: { code: "NOT_FOUND", message: "The requested API resource was not found." }
}));

// Serve the compiled Vite application when a web build is present.
const webDist = path.resolve(process.cwd(), "apps/web/dist");
if (fs.existsSync(webDist)) {
  app.use(apiLimiter, express.static(webDist));
  app.get("/", apiLimiter, (_request, response) => response.sendFile(path.join(webDist, "index.html")));
} else {
  app.get("/", apiLimiter, (_request, response) => response.status(200).json({
    name: "CareMesh API",
    status: "foundation",
    notice: "Synthetic-data development foundation only; build apps/web to serve the dashboard."
  }));
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: "Invalid JSON request body" });
    return;
  }
  response.status(500).json({ error: "Internal server error" });
});