import { Router } from "express";
import { z } from "zod";

export const consentRouter = Router();

const consentDecisionSchema = z.object({
  consentStatus: z.enum(["active", "revoked", "expired", "unknown"]),
  requestedPurpose: z.string().min(1).max(120),
  permittedPurposes: z.array(z.string().min(1).max(120)).max(50),
  validFrom: z.string().datetime({ offset: true }),
  validUntil: z.string().datetime({ offset: true })
}).strict();

// This endpoint evaluates a supplied synthetic consent snapshot. It is not an
// identity, authorization, or clinical-data access boundary: those require
// trusted server-side patient/tenant context and persisted consent evidence.
consentRouter.post("/evaluate", (request, response) => {
  const parsed = consentDecisionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "Consent decision input failed validation",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  const consent = parsed.data;
  const now = Date.now();
  const startsAt = Date.parse(consent.validFrom);
  const endsAt = Date.parse(consent.validUntil);
  const withinValidityWindow = startsAt <= now && now < endsAt;
  const purposeAllowed = consent.permittedPurposes.includes(consent.requestedPurpose);
  const allowed =
    consent.consentStatus === "active" &&
    withinValidityWindow &&
    purposeAllowed;

  response.status(200).json({
    decision: allowed ? "allow" : "deny",
    reasons: [
      ...(consent.consentStatus !== "active" ? ["consent-not-active"] : []),
      ...(!withinValidityWindow ? ["outside-validity-window"] : []),
      ...(!purposeAllowed ? ["purpose-not-permitted"] : [])
    ]
  });
});