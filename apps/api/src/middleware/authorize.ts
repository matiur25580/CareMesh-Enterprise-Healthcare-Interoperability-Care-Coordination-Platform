import type { RequestHandler } from "express";
import type { AccessRole } from "../auth/types.js";
export function authorize(...allowed: AccessRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth || !allowed.includes(req.auth.role)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action." } });
      return;
    }
    next();
  };
}
