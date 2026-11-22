import type { RequestHandler } from "express";
import { SessionModel } from "../models/session.model.js";
import { verifyAccessToken } from "../auth/tokens.js";
import type { AccessRole } from "../auth/types.js";
const roles = new Set<AccessRole>(["owner", "admin", "clinician", "coordinator", "analyst", "member"]);
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } });
      return;
    }
    const claims = verifyAccessToken(header.slice(7));
    if (!roles.has(claims.role as AccessRole)) throw new Error("Invalid role claim");
    const session = await SessionModel.findOne({
      _id: claims.sid, userId: claims.sub, organizationId: claims.tenantId, revokedAt: null, expiresAt: { $gt: new Date() }
    }).select("_id");
    if (!session) {
      res.status(401).json({ error: { code: "SESSION_EXPIRED", message: "Your session is no longer active." } });
      return;
    }
    req.auth = { userId: claims.sub, tenantId: claims.tenantId, role: claims.role as AccessRole, sessionId: claims.sid };
    next();
  } catch {
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "The access token is invalid or expired." } });
  }
};
