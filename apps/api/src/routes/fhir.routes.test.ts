import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findOne, auditEvent, consentCheck } = vi.hoisted(() => ({
  findOne: vi.fn(),
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
vi.mock("../models/patient.model.js", () => ({ PatientModel: { findOne } }));
vi.mock("../services/audit.service.js", () => ({ recordAuditEvent: auditEvent }));
vi.mock("../services/consent.service.js", () => ({
  hasActiveConsent: consentCheck,
  parseConsentPurpose: (value: unknown) => ["treatment", "payment", "operations"].includes(String(value))
    ? value : null
}));

import { fhirRouter } from "./fhir.routes.js";

const app = express();
app.use("/fhir/R4", fhirRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error instanceof Error ? error.message : "unknown" });
});

const storedPatient = {
  _id: "64b000000000000000000010",
  medicalRecordNumber: "CM-SYNTH-001",
  identifiers: [],
  name: { given: ["Avery"], family: "Sample" },
  birthDate: new Date("1990-05-12T00:00:00.000Z"),
  administrativeGender: "unknown" as const,
  status: "active" as const
};

describe("FHIR R4 Patient exchange route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditEvent.mockResolvedValue(undefined);
    consentCheck.mockResolvedValue(true);
    findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(storedPatient) });
  });

  it("returns a FHIR Patient only after tenant-scoped consent authorization and audits the exchange", async () => {
    const response = await request(app)
      .get("/fhir/R4/Patient/64b000000000000000000010?purpose=treatment");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/fhir+json");
    expect(response.body.resourceType).toBe("Patient");
    expect(response.body.identifier[0].value).toBe("CM-SYNTH-001");
    expect(findOne).toHaveBeenCalledWith({
      _id: "64b000000000000000000010",
      organizationId: "64b000000000000000000002"
    });
    expect(consentCheck).toHaveBeenCalledWith({
      organizationId: "64b000000000000000000002",
      patientId: "64b000000000000000000010",
      purpose: "treatment"
    });
    expect(auditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "fhir.patient.read",
      purposeOfUse: "treatment",
      outcome: "success"
    }));
  });

  it("rejects requests without an explicit purpose of use", async () => {
    const response = await request(app).get("/fhir/R4/Patient/64b000000000000000000010");
    expect(response.status).toBe(400);
    expect(response.body.resourceType).toBe("OperationOutcome");
    expect(findOne).not.toHaveBeenCalled();
  });

  it("does not disclose a patient when matching consent is absent", async () => {
    consentCheck.mockResolvedValue(false);
    const response = await request(app)
      .get("/fhir/R4/Patient/64b000000000000000000010?purpose=treatment");

    expect(response.status).toBe(403);
    expect(response.body.resourceType).toBe("OperationOutcome");
    expect(auditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "fhir.patient.read",
      outcome: "denied"
    }));
  });

  it("returns not-found when the patient is outside the authenticated organization", async () => {
    findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const response = await request(app)
      .get("/fhir/R4/Patient/64b000000000000000000010?purpose=treatment");
    expect(response.status).toBe(404);
    expect(consentCheck).not.toHaveBeenCalled();
  });
});
