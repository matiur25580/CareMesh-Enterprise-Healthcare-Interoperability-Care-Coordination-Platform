import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export interface AccessClaims { sub: string; tenantId: string; role: string; sid: string }
export function issueAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: "15m", issuer: "caremesh-api", audience: "caremesh-web" });
}
export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.JWT_SECRET, { issuer: "caremesh-api", audience: "caremesh-web" }) as AccessClaims;
}
export function newRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
