import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { PatientModel } from "../models/patient.model.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { hasActiveConsent, parseConsentPurpose } from "../services/consent.service.js";
import { mapCareMeshPatientToFhirR4 } from "../fhir/patient.mapper.js";

export const fhirRouter = Router();
fhirRouter.use(authenticate);

function outcome(res: import("express").Response, status: number, code: string, diagnostics: string) {
  return res.status(status).type("application/fhir+json").json({
    resourceType: "OperationOutcome",
    issue: [{ severity: status >= 500 ? "error" : "error", code, diagnostics }]
  });
}

fhirRouter.get("/Patient/:patientId", async (req, res, next) => {
  try {
    const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
    if (!patientId || !Types.ObjectId.isValid(patientId)) {
      outcome(res, 400, "value", "A valid CareMesh patient identifier is required.");
      return;
    }
    const purpose = parseConsentPurpose(req.query.purpose);
    if (!purpose) {
      outcome(res, 400, "required", "Specify purpose=treatment, payment, or operations.");
      return;
    }
    const patient = await PatientModel.findOne({
      _id: patientId,
      organizationId: req.auth!.tenantId
    }).lean();
    if (!patient) {
      outcome(res, 404, "not-found", "Patient was not found in the active organization.");
      return;
    }
    if (!await hasActiveConsent({
      organizationId: req.auth!.tenantId,
      patientId,
      purpose
    })) {
      await recordAuditEvent({
        actorUserId: req.auth!.userId,
        organizationId: req.auth!.tenantId,
        action: "fhir.patient.read",
        resourceType: "Patient",
        resourceId: patientId,
        purposeOfUse: purpose,
        outcome: "denied",
        request: req
      });
      outcome(res, 403, "forbidden", "Active consent does not authorize this purpose of use.");
      return;
    }
    const resource = mapCareMeshPatientToFhirR4(patient);
    await recordAuditEvent({
      actorUserId: req.auth!.userId,
      organizationId: req.auth!.tenantId,
      action: "fhir.patient.read",
      resourceType: "Patient",
      resourceId: patientId,
      purposeOfUse: purpose,
      outcome: "success",
      request: req
    });
    res.status(200).type("application/fhir+json").json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      outcome(res, 500, "processing", "The stored patient record cannot be represented by the supported FHIR R4 Patient subset.");
      return;
    }
    next(error);
  }
});
