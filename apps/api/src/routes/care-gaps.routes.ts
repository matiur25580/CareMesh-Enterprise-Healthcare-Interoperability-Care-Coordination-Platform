import { Router, type Request } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PatientModel } from "../models/patient.model.js";
import { CareGapModel } from "../models/care-gap.model.js";
import { MembershipModel } from "../models/membership.model.js";
import { hasActiveConsent } from "../services/consent.service.js";
import { recordAuditEvent } from "../services/audit.service.js";

export const careGapsRouter = Router();
careGapsRouter.use(authenticate);

const patientIdFrom = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const idSchema = z.string().regex(/^[a-f\\d]{24}$/i);
const createSchema = z.object({
  patientId: idSchema,
  category: z.enum(["screening", "medication_review", "follow_up", "care_plan", "preventive_care", "other"]),
  description: z.string().trim().min(3).max(500),
  priority: z.enum(["routine", "soon", "urgent"]).default("routine"),
  dueAt: z.coerce.date(),
  assignedTo: idSchema.optional()
});
const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  priority: z.enum(["routine", "soon", "urgent"]).optional(),
  assignedTo: idSchema.nullable().optional(),
  resolutionNote: z.string().trim().max(1000).optional()
}).refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

async function audit(req: Request, action: string, resourceId: string, outcome: "success" | "denied" = "success") {
  await recordAuditEvent({
    actorUserId: req.auth!.userId,
    organizationId: req.auth!.tenantId,
    action,
    resourceType: "CareGap",
    resourceId,
    purposeOfUse: "treatment",
    outcome,
    request: req
  });
}

async function patientAccess(req: Request, patientId: string): Promise<boolean> {
  const patient = await PatientModel.exists({ _id: patientId, organizationId: req.auth!.tenantId, status: "active" });
  return Boolean(patient && await hasActiveConsent({
    organizationId: req.auth!.tenantId,
    patientId,
    purpose: "treatment"
  }));
}

// Queue is always tenant-scoped and consent-gated per patient; no cross-tenant patient identifiers are exposed.
careGapsRouter.get("/", authorize("owner", "admin", "clinician", "coordinator", "analyst"), async (req, res, next) => {
  try {
    const query = z.object({
      status: z.enum(["open", "in_progress", "resolved"]).optional(),
      priority: z.enum(["routine", "soon", "urgent"]).optional(),
      patientId: idSchema.optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50)
    }).parse(req.query);
    const filter: Record<string, unknown> = { organizationId: req.auth!.tenantId };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.patientId) {
      if (!await patientAccess(req, query.patientId)) {
        await audit(req, "care_gap.queue.denied", query.patientId, "denied");
        res.status(403).json({ error: { code: "CARE_GAP_ACCESS_DENIED", message: "Active treatment consent is required for this patient." } });
        return;
      }
      filter.patientId = query.patientId;
    }
    const gaps = await CareGapModel.find(filter).sort({ dueAt: 1, priority: -1 }).limit(query.limit).lean();
    const allowed = [];
    for (const gap of gaps) {
      if (await hasActiveConsent({ organizationId: req.auth!.tenantId, patientId: String(gap.patientId), purpose: "treatment" })) allowed.push(gap);
    }
    await audit(req, "care_gap.queue.read", "organization");
    res.json({ data: allowed, meta: { returned: allowed.length, limit: query.limit } });
  } catch (error) { next(error); }
});

careGapsRouter.post("/", authorize("owner", "admin", "clinician", "coordinator"), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    if (!await patientAccess(req, input.patientId)) {
      await audit(req, "care_gap.create.denied", input.patientId, "denied");
      res.status(403).json({ error: { code: "CARE_GAP_ACCESS_DENIED", message: "Patient must exist in this organization and have active treatment consent." } });
      return;
    }
    if (input.assignedTo) {
      const assigneeMembership = await MembershipModel.exists({ userId: input.assignedTo, organizationId: req.auth!.tenantId, status: "active" });
      if (!assigneeMembership) {
        res.status(400).json({ error: { code: "INVALID_ASSIGNEE", message: "The assignee must be an active member of this organization." } });
        return;
      }
    }
      return;
    }
    const gap = await CareGapModel.create({
      ...input,
      organizationId: req.auth!.tenantId,
      createdBy: req.auth!.userId,
      updatedBy: req.auth!.userId
    });
    await audit(req, "care_gap.create", String(gap._id));
    res.status(201).json({ data: gap });
  } catch (error) { next(error); }
});

careGapsRouter.patch("/:careGapId", authorize("owner", "admin", "clinician", "coordinator"), async (req, res, next) => {
  try {
    const careGapId = patientIdFrom(req.params.careGapId);
    if (!careGapId || !Types.ObjectId.isValid(careGapId)) {
      res.status(400).json({ error: { code: "INVALID_CARE_GAP_ID", message: "The care-gap identifier is invalid." } });
      return;
    }
    const input = updateSchema.parse(req.body);
    const gap = await CareGapModel.findOne({ _id: careGapId, organizationId: req.auth!.tenantId });
    if (!gap) {
      res.status(404).json({ error: { code: "CARE_GAP_NOT_FOUND", message: "The care gap was not found in this organization." } });
      return;
    }
    if (input.assignedTo) {
      const assigneeMembership = await MembershipModel.exists({ userId: input.assignedTo, organizationId: req.auth!.tenantId, status: "active" });
      if (!assigneeMembership) {
        res.status(400).json({ error: { code: "INVALID_ASSIGNEE", message: "The assignee must be an active member of this organization." } });
        return;
      }
    }
    if (!await patientAccess(req, String(gap.patientId))) {
      await audit(req, "care_gap.update.denied", careGapId, "denied");
      res.status(403).json({ error: { code: "CARE_GAP_ACCESS_DENIED", message: "Active treatment consent is required for this patient." } });
      return;
    }
    if (input.status === "resolved" && !input.resolutionNote?.trim() && !gap.resolutionNote) {
      res.status(400).json({ error: { code: "RESOLUTION_NOTE_REQUIRED", message: "A resolution note is required when closing a care gap." } });
      return;
    }
    Object.assign(gap, input, { updatedBy: req.auth!.userId });
    await gap.save();
    await audit(req, "care_gap.update", careGapId);
    res.json({ data: gap });
  } catch (error) { next(error); }
});
