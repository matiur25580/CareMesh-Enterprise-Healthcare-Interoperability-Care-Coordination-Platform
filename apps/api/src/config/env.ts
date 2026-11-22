import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/caremesh"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  JWT_SECRET: z.string().min(32).default("development-only-secret-change-before-deploy-123")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
if (parsed.data.NODE_ENV === "production" && parsed.data.JWT_SECRET.startsWith("development-only-")) {
  throw new Error("JWT_SECRET must be replaced with a strong production secret.");
}
export const env = parsed.data;
