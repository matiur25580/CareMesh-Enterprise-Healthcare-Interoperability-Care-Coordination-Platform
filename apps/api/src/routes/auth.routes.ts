import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { hashRefreshToken, issueAccessToken, newRefreshToken } from "../auth/tokens.js";
import { authenticate } from "../middleware/authenticate.js";
import { UserModel } from "../models/user.model.js";
import { OrganizationModel } from "../models/organization.model.js";
import { MembershipModel } from "../models/membership.model.js";
import { SessionModel } from "../models/session.model.js";
import { env } from "../config/env.js";

export const authRouter = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  organizationName: z.string().trim().min(2).max(160),
  organizationType: z.enum(["hospital", "clinic", "laboratory", "pharmacy", "payer", "care_network"])
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });
const cookieOptions = {
  httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict" as const,
  path: "/api/v1/auth", maxAge: 30 * 24 * 60 * 60 * 1000
};
function setRefreshCookie(res: import("express").Response, token: string): void {
  res.cookie("caremesh_refresh", token, cookieOptions);
}
function clearRefreshCookie(res: import("express").Response): void {
  res.clearCookie("caremesh_refresh", { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict", path: "/api/v1/auth" });
}
function readRefreshCookie(req: import("express").Request): string | undefined {
  const cookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("caremesh_refresh="));
  return cookie ? decodeURIComponent(cookie.slice("caremesh_refresh=".length)) : undefined;
}
async function createSession(userId: Types.ObjectId, organizationId: Types.ObjectId, role: string, res: import("express").Response) {
  const refresh = newRefreshToken();
  const session = await SessionModel.create({
    userId, organizationId, refreshTokenHash: hashRefreshToken(refresh),
    expiresAt: new Date(Date.now() + cookieOptions.maxAge)
  });
  setRefreshCookie(res, refresh);
  return { accessToken: issueAccessToken({ sub: userId.toString(), tenantId: organizationId.toString(), role, sid: session.id }), expiresIn: 900 };
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();
    if (await UserModel.exists({ email })) {
      res.status(409).json({ error: { code: "ACCOUNT_EXISTS", message: "An account with this email already exists." } });
      return;
    }
    const user = await UserModel.create({ email, name: input.name, passwordHash: await hashPassword(input.password) });
    const slugBase = input.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "organization";
    const organization = await OrganizationModel.create({
      name: input.organizationName, slug: `${slugBase}-${user.id.slice(-6)}`, type: input.organizationType
    });
    await MembershipModel.create({ userId: user._id, organizationId: organization._id, role: "owner", status: "active" });
    const tokens = await createSession(user._id, organization._id, "owner", res);
    res.status(201).json({ data: { user: { id: user.id, name: user.name, email: user.email }, organization: { id: organization.id, name: organization.name, type: organization.type, role: "owner" }, ...tokens } });
  } catch (error) { next(error); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
    if (!user || user.status !== "active" || !(await verifyPassword(input.password, user.passwordHash))) {
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
      return;
    }
    const membership = await MembershipModel.findOne({ userId: user._id, status: "active" }).sort({ createdAt: 1 });
    if (!membership) {
      res.status(403).json({ error: { code: "NO_ACTIVE_MEMBERSHIP", message: "No active organization membership is available." } });
      return;
    }
    const tokens = await createSession(user._id, membership.organizationId, membership.role, res);
    res.json({ data: { user: { id: user.id, name: user.name, email: user.email }, organizationId: membership.organizationId.toString(), role: membership.role, ...tokens } });
  } catch (error) { next(error); }
});

authRouter.post("/refresh", async (req, res) => {
  const token = readRefreshCookie(req);
  if (!token) {
    res.status(401).json({ error: { code: "REFRESH_REQUIRED", message: "A valid refresh session is required." } });
    return;
  }
  const session = await SessionModel.findOneAndUpdate(
    { refreshTokenHash: hashRefreshToken(token), revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { refreshTokenHash: hashRefreshToken(newRefreshToken()) } },
    { new: false }
  ).select("+refreshTokenHash");
  if (!session) {
    clearRefreshCookie(res);
    res.status(401).json({ error: { code: "REFRESH_INVALID", message: "The refresh session is invalid or expired." } });
    return;
  }
  const rotated = newRefreshToken();
  session.refreshTokenHash = hashRefreshToken(rotated);
  await session.save();
  setRefreshCookie(res, rotated);
  const membership = await MembershipModel.findOne({ userId: session.userId, organizationId: session.organizationId, status: "active" });
  if (!membership) {
    session.revokedAt = new Date(); await session.save(); clearRefreshCookie(res);
    res.status(403).json({ error: { code: "MEMBERSHIP_INACTIVE", message: "Organization access is no longer active." } });
    return;
  }
  res.json({ data: { accessToken: issueAccessToken({ sub: session.userId.toString(), tenantId: session.organizationId.toString(), role: membership.role, sid: session.id }), expiresIn: 900 } });
});

authRouter.post("/logout", async (req, res) => {
  const token = readRefreshCookie(req);
  if (token) await SessionModel.updateOne({ refreshTokenHash: hashRefreshToken(token), revokedAt: null }, { $set: { revokedAt: new Date() } });
  clearRefreshCookie(res);
  res.status(204).send();
});

authRouter.get("/me", authenticate, async (req, res) => {
  const user = await UserModel.findById(req.auth!.userId).select("name email status");
  const organization = await OrganizationModel.findOne({ _id: req.auth!.tenantId, status: "active" }).select("name type status");
  if (!user || !organization) {
    res.status(401).json({ error: { code: "ACCOUNT_UNAVAILABLE", message: "The account or active organization is unavailable." } });
    return;
  }
  res.json({ data: { user: { id: user.id, name: user.name, email: user.email }, organization: { id: req.auth!.tenantId, name: organization.name, type: organization.type }, role: req.auth!.role } });
});
