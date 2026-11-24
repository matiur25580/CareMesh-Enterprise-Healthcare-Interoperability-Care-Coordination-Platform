import { Router } from "express";
import { z } from "zod";
import { ConsentEvaluation } from "../models/ConsentEvaluation";
export const consentRouter = Router();
const consentDecisionSchema = z.object({
  consentStatus: z.enum(["active", "revoked", "expired", "unknown"]),
  requestedPurpose: z.string().trim().min(1).max(120),
  permittedPurposes: z.array(z.string().trim().min(1).max(120)).max(50),
  validFrom: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true })
}).strict();
consentRouter.get("/history", async (request, response) => {
  try {
    const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
    const items = await ConsentEvaluation.find({ tenantId: request.auth!.tenantId }).sort({ evaluatedAt: -1 }).limit(limit).lean();
    response.status(200).json({ items, count: items.length });
  } catch { response.status(500).json({ error: "Unable to load consent decision history" }); }
});
consentRouter.post("/evaluate", async (request, response) => {
  const parsed = consentDecisionSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Consent decision input failed validation", details: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
    return;
  }
  const consent = parsed.data;
  const now = Date.now();
  const withinValidityWindow = Date.parse(consent.validFrom) <= now && now < Date.parse(consent.validUntil);
  const purposeAllowed = consent.permittedPurposes.includes(consent.requestedPurpose);
  const allowed = consent.consentStatus === "active" && withinValidityWindow && purposeAllowed;
  const reasons = [
    ...(consent.consentStatus !== "active" ? ["consent-not-active"] : []),
    ...(!withinValidityWindow ? ["outside-validity-window"] : []),
    ...(!purposeAllowed ? ["purpose-not-permitted"] : [])
  ];
  const decision = allowed ? "allow" : "deny";
  try {
    await ConsentEvaluation.create({
      tenantId: request.auth!.tenantId, actorUserId: request.auth!.userId,
      requestedPurpose: consent.requestedPurpose, consentStatus: consent.consentStatus,
      decision, reasons, evaluatedAt: new Date(now)
    });
  } catch { response.status(500).json({ error: "Unable to record consent evaluation" }); return; }
  response.status(200).json({ decision, reasons, evaluatedAt: new Date(now).toISOString(), notice: "Synthetic simulator result only; this is not an EHR access authorization." });
});