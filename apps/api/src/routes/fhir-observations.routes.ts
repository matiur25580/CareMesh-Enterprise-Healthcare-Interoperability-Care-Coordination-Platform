import { Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/authenticate.js";
import { ClinicalRecordModel } from "../models/clinical-record.model.js";
import { PatientModel } from "../models/patient.model.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { hasActiveConsent, parseConsentPurpose } from "../services/consent.service.js";
import { mapCareMeshObservationToFhirR4 } from "../fhir/observation.mapper.js";
import { fhirR4ObservationBundleSchema } from "../fhir/observation.schema.js";

export const fhirObservationsRouter = Router();
fhirObservationsRouter.use(authenticate);

function outcome(res: import("express").Response, status: number, code: string, diagnostics: string) {
  return res.status(status).type("application/fhir+json").json({
    resourceType: "OperationOutcome",
    issue: [{ severity: "error", code, diagnostics }]
  });
}

fhirObservationsRouter.get("/Observation", async (req, res, next) => {
  try {
    const patientReference = typeof req.query.patient === "string" ? req.query.patient : "";
    const match = /^Patient\/([a-f\d]{24})$/i.exec(patientReference);
    if (!match || !Types.ObjectId.isValid(match[1])) {
      outcome(res, 400, "value", "Specify patient=Patient/{patientId} using a valid CareMesh patient identifier.");
      return;
    }
    const patientId = match[1];
    const purpose = parseConsentPurpose(req.query.purpose);
    if (!purpose) {
      outcome(res, 400, "required", "Specify purpose=treatment, payment, or operations.");
      return;
    }

    const patient = await PatientModel.findOne({
      _id: patientId,
      organizationId: req.auth!.tenantId
    }).select({ _id: 1 }).lean();
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
        action: "fhir.observation.search",
        resourceType: "Observation",
        resourceId: patientId,
        purposeOfUse: purpose,
        outcome: "denied",
        request: req
      });
      outcome(res, 403, "forbidden", "Active consent does not authorize this purpose of use.");
      return;
    }

    const records = await ClinicalRecordModel.find({
      organizationId: req.auth!.tenantId,
      patientId,
      resourceType: "observation"
    }).sort({ effectiveAt: -1 }).limit(100).lean();

    const bundle = fhirR4ObservationBundleSchema.parse({
      resourceType: "Bundle",
      type: "searchset",
      total: records.length,
      entry: records.map((record) => {
        const resource = mapCareMeshObservationToFhirR4(record);
        return {
          fullUrl: "urn:uuid:" + resource.id,
          resource
        };
      })
    });

    await recordAuditEvent({
      actorUserId: req.auth!.userId,
      organizationId: req.auth!.tenantId,
      action: "fhir.observation.search",
      resourceType: "Observation",
      resourceId: patientId,
      purposeOfUse: purpose,
      outcome: "success",
      request: req
    });

    res.status(200).type("application/fhir+json").json(bundle);
  } catch (error) {
    next(error);
  }
});
