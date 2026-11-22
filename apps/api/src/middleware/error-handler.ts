import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "The request contains invalid fields.", details: error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })) }
    });
    return;
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    res.status(409).json({ error: { code: "DUPLICATE_RESOURCE", message: "A resource with these unique details already exists." } });
    return;
  }
  logger.error({ err: error }, "Unhandled request error");
  res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } });
};
