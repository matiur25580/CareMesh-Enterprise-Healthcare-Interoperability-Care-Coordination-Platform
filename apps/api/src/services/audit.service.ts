import type { Request } from "express";
import { AuditEventModel } from "../models/audit-event.model.js";
export async function recordAuditEvent(input: {
  actorUserId: string; organizationId: string; action: string; resourceType: string;
  resourceId?: string; outcome: "success" | "denied"; request?: Request;
}): Promise<void> {
  await AuditEventModel.create({
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    outcome: input.outcome,
    requestId: input.request?.header("x-request-id")
  });
}
