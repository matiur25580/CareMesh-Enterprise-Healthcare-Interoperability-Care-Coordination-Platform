import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { MembershipModel } from "../models/membership.model.js";
import { OrganizationModel } from "../models/organization.model.js";
import { SessionModel } from "../models/session.model.js";
import { issueAccessToken } from "../auth/tokens.js";

export const organizationsRouter = Router();
organizationsRouter.use(authenticate);

organizationsRouter.get("/", async (req, res) => {
  const memberships = await MembershipModel.find({ userId: req.auth!.userId, status: "active" }).populate("organizationId", "name type status");
  res.json({ data: memberships.filter((m) => m.organizationId && typeof m.organizationId === "object").map((m) => {
    const org = m.organizationId as unknown as { id: string; name: string; type: string; status: string };
    return { id: org.id, name: org.name, type: org.type, status: org.status, role: m.role };
  }) });
});

organizationsRouter.post("/switch", async (req, res) => {
  const input = z.object({ organizationId: z.string().regex(/^[a-f\d]{24}$/i) }).parse(req.body);
  const membership = await MembershipModel.findOne({ userId: req.auth!.userId, organizationId: input.organizationId, status: "active" });
  const organization = await OrganizationModel.findOne({ _id: input.organizationId, status: "active" });
  if (!membership || !organization) {
    res.status(403).json({ error: { code: "TENANT_ACCESS_DENIED", message: "You do not have access to this organization." } });
    return;
  }
  const session = await SessionModel.findOne({ _id: req.auth!.sessionId, userId: req.auth!.userId, revokedAt: null });
  if (!session) {
    res.status(401).json({ error: { code: "SESSION_EXPIRED", message: "Your session is no longer active." } });
    return;
  }
  session.organizationId = organization._id;
  await session.save();
  res.json({ data: { accessToken: issueAccessToken({ sub: req.auth!.userId, tenantId: organization.id, role: membership.role, sid: session.id }), expiresIn: 900, organization: { id: organization.id, name: organization.name, type: organization.type }, role: membership.role } });
});

organizationsRouter.get("/current", authorize("owner", "admin", "clinician", "coordinator", "analyst", "member"), async (req, res) => {
  const organization = await OrganizationModel.findOne({ _id: req.auth!.tenantId, status: "active" }).select("name type status");
  if (!organization) {
    res.status(404).json({ error: { code: "TENANT_NOT_FOUND", message: "The active organization was not found." } });
    return;
  }
  res.json({ data: { id: organization.id, name: organization.name, type: organization.type, status: organization.status, role: req.auth!.role } });
});
