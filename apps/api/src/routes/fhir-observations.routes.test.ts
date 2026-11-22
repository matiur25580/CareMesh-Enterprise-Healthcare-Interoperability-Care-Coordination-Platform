import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findPatient, findRecords, auditEvent, consentCheck } = vi.hoisted(() => ({
  findPatient: vi.fn(),
  findRecords: vi.fn(),
  auditEvent: vi.fn(),
  consentCheck: vi.fn()
}));

vi.mock("../middleware/authenticate.js", () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    Object.assign(req, { auth: {
      userId: "64b000000000000000000001",
      tenantId: "64b000000000000000000002",
      role: "clinician",
      sessionId: "64b000000000000000000003"
    }});
    next();
  }
}));
vi.mock("../models/patient.model.js", () => ({ PatientModel: { findOne: findPatient } }));
vi.mock("../models/clinical-record.model.js", () => ({ ClinicalRecordModel: { find: findRecords } }));
vi.mock("../services/audit.service.js", () => ({ recordAuditEvent: auditEvent }));
vi.mock("../services/consent.service.js", () => ({
  hasActiveConsent: consentCheck,
  parseConsentPurpose: (value: unknown) => ["treatment", "payment", "operations"].includes(String(value))
    ? value : null
}));

import { fhirObservationsRouter } from "./fhir-observations.routes.js";

const app = express();
app.use("/fhir/R4", fhirObservationsRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error instanceof Error ? error.message : "unknown" });
});

const patientId = "64b000000000000000000010";
const record = {
  _id: "64b000000000000000000020",
  patientId,
  code: { system: "http://loinc.org", value: "8867-4", display: "Heart rate" },
  status: "active" as const,
  effectiveAt: new Date("2026-10-01T09:30:00.000Z"),
  createdAt: new Date("2026-10-01T09:31:00.000Z"),
  note: "Synthetic test observation"
};

describe("FHIR R4 Observation search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditEvent.mockResolvedValue(undefined);
    consentCheck.mockResolvedValue(true);
    findPatient.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: patientId }) }) });
    findRecords.mockReturnValue({
      sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([record]) }) })
    });
  });

  it("returns a tenant-scoped FHIR searchset after purpose-matched consent and audits it", async () => {
    const response = await request(app)
      .get("/fhir/R4/Observation")
      .query({ patient: "Patient/" + patientId, purpose: "treatment" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/fhir+json");
    expect(response.body.resourceType).toBe("Bundle");
    expect(response.body.type).toBe("searchset");
    expect(response.body.total).toBe(1);
    expect(response.body.entry[0].resource.resourceType).toBe("Observation");
    expect(findPatient).toHaveBeenCalledWith({
      _id: patientId,
      organizationId: "64b000000000000000000002"
    });
    expect(findRecords).toHaveBeenCalledWith({
      organizationId: "64b000000000000000000002",
      patientId,
      resourceType: "observation"
    });
    expect(consentCheck).toHaveBeenCalledWith({
      organizationId: "64b000000000000000000002",
      patientId,
      purpose: "treatment"
    });
    expect(auditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "fhir.observation.search",
      purposeOfUse: "treatment",
      outcome: "success"
    }));
  });

  it("requires a valid patient reference and explicit purpose", async () => {
    const missingPatient = await request(app).get("/fhir/R4/Observation?purpose=treatment");
    expect(missingPatient.status).toBe(400);
    const missingPurpose = await request(app).get("/fhir/R4/Observation?patient=Patient/" + patientId);
    expect(missingPurpose.status).toBe(400);
    expect(findRecords).not.toHaveBeenCalled();
  });

  it("denies the exchange without matching active consent and audits the denial", async () => {
    consentCheck.mockResolvedValue(false);
    const response = await request(app)
      .get("/fhir/R4/Observation")
      .query({ patient: "Patient/" + patientId, purpose: "treatment" });

    expect(response.status).toBe(403);
    expect(response.body.resourceType).toBe("OperationOutcome");
    expect(findRecords).not.toHaveBeenCalled();
    expect(auditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "fhir.observation.search",
      outcome: "denied"
    }));
  });

  it("does not return records for a patient outside the authenticated tenant", async () => {
    findPatient.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) });
    const response = await request(app)
      .get("/fhir/R4/Observation")
      .query({ patient: "Patient/" + patientId, purpose: "treatment" });

    expect(response.status).toBe(404);
    expect(consentCheck).not.toHaveBeenCalled();
    expect(findRecords).not.toHaveBeenCalled();
  });
});
