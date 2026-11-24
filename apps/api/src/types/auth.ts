import type { Request } from "express";

export type CareMeshRole = "platform-admin" | "organization-admin" | "clinician" | "care-coordinator" | "patient" | "auditor";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: CareMeshRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export type AuthenticatedRequest = Request & { auth: AuthContext };