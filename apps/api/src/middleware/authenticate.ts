import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { User } from "../models/User";
import type { CareMeshRole } from "../types/auth";

const ISSUER = "caremesh-api";
const AUDIENCE = "caremesh-client";

export async function authenticate(request: Request, response: Response, next: NextFunction): Promise<void> {
  const token = request.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.JWT_SECRET;

  if (!token || !secret || secret.length < 32) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const claims = jwt.verify(token, secret, {
      algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE
    }) as JwtPayload;

    if (typeof claims.sub !== "string" || typeof claims.tenantId !== "string") {
      response.status(401).json({ error: "Invalid access token" });
      return;
    }

    // Revalidate the account and tenant on every request so revoked accounts
    // or changed roles cannot continue using an otherwise valid JWT.
    const user = await User.findOne({
      _id: claims.sub, tenantId: claims.tenantId, active: true
    }).select("tenantId role").lean();

    if (!user) {
      response.status(401).json({ error: "Account is inactive or unavailable" });
      return;
    }

    request.auth = {
      userId: String(user._id),
      tenantId: user.tenantId,
      role: user.role as CareMeshRole
    };
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired access token" });
  }
}