export type AccessRole = "owner" | "admin" | "clinician" | "coordinator" | "analyst" | "member";
export interface AuthContext { userId: string; tenantId: string; role: AccessRole; sessionId: string }
declare global {
  namespace Express { interface Request { auth?: AuthContext } }
}
