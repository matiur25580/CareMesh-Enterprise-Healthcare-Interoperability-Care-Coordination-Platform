import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findOne, create, patientExists, consentFind, consentFindOneAndUpdate, auditEvent } = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  patientExists: vi.fn(),
  consentFind: vi.fn(),
  consentFindOneAndUpdate: vi.fn(),
  auditEvent: vi.fn()
}));

vi.mock("../middleware/authenticate.js", () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    Object.assign(req, {
      auth: {
        userId: "64b000000000000000000001",
        tenantId: "64b000000000000000000002",
        role: "clinician",
        sessionId: "64b000000000000000000003"
      }
    });
    next();
  }
}));

vi.mock("../models/patient.model.js", () => ({ PatientModel: { findOne, create, exists: patientExists } }));
vi.mock("../models/clinical-record.model.js", () => ({ ClinicalRecordModel: {} }));
vi.mock("../models/consent.model.js", () => ({ ConsentModel: { find: consentFind, findOneAndUpdate: consentFindOneAndUpdate, create: vi.fn(), distinct: vi.fn() }, CONSENT_PURPOSES: ["treatment", "payment", "operations"] }));
vi.mock("../services/audit.service.js", () => ({ recordAuditEvent: auditEvent }));

import { patientsRouter } from "./patients.routes.js";

const app = express();
app.use(express.json());
app.use("/patients", patientsRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error && error.name === "ZodError") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
    return;
  }
  res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR" } });
});

const validPatient = {
  medicalRecordNumber: "CM-SYNTH-001",
  name: { given: ["Avery"], family: "Sample" },
  birthDate: "1990-05-12",
  administrativeGender: "unknown"
};

describe("patient API integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditEvent.mockResolvedValue(undefined);
    patientExists.mockResolvedValue({ _id: "64b000000000000000000010" });
    findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    create.mockResolvedValue({
      _id: "64b000000000000000000010",
      organizationId: "64b000000000000000000002",
      ...validPatient
    });
  });

  it("creates a patient within the authenticated organization", async () => {
    const response = await request(app).post("/patients").send(validPatient);

    expect(response.status).toBe(201);
    expect(response.body.data.medicalRecordNumber).toBe("CM-SYNTH-001");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "64b000000000000000000002",
      createdBy: "64b000000000000000000001",
      updatedBy: "64b000000000000000000001"
    }));
    expect(auditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "64b000000000000000000001",
      organizationId: "64b000000000000000000002",
      action: "patient.create",
      resourceType: "Patient",
      outcome: "success"
    }));
  });

  it("rejects a duplicate patient identity in the same organization", async () => {
    findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "64b000000000000000000010", medicalRecordNumber: "CM-SYNTH-001" })
    });

    const response = await request(app).post("/patients").send(validPatient);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PATIENT_IDENTITY_CONFLICT");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects malformed patient input before database writes", async () => {
    const response = await request(app).post("/patients").send({
      ...validPatient,
      name: { given: [], family: "" }
    });

    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("scopes the duplicate lookup to the authenticated organization", async () => {
    await request(app).post("/patients").send(validPatient);

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "64b000000000000000000002"
    }));
  });

  it("returns consent history scoped to the active organization and patient", async () => {
    const consentRows = [{ _id: "64b000000000000000000020", purposes: ["treatment"], status: "active" }];
    consentFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(consentRows) })
      })
    });

    const response = await request(app).get("/patients/64b000000000000000000010/consents");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(consentRows);
    expect(patientExists).toHaveBeenCalledWith({
      _id: "64b000000000000000000010",
      organizationId: "64b000000000000000000002"
    });
    expect(consentFind).toHaveBeenCalledWith({
      patientId: "64b000000000000000000010",
      organizationId: "64b000000000000000000002"
    });
    expect(auditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "consent.history.read",
      resourceType: "Consent",
      outcome: "success"
    }));
  });

  it("does not disclose consent history for a patient outside the active organization", async () => {
    patientExists.mockResolvedValue(null);

    const response = await request(app).get("/patients/64b000000000000000000010/consents");

    expect(response.status).toBe(404);
    expect(consentFind).not.toHaveBeenCalled();
  });

  it("revokes only an active consent belonging to the patient and organization", async () => {
    const revoked = { _id: "64b000000000000000000020", status: "revoked" };
    consentFindOneAndUpdate.mockResolvedValue(revoked);

    const response = await request(app)
      .post("/patients/64b000000000000000000010/consents/64b000000000000000000020/revoke")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("revoked");
    expect(consentFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: "64b000000000000000000020",
        patientId: "64b000000000000000000010",
        organizationId: "64b000000000000000000002",
        status: "active"
      },
      { $set: expect.objectContaining({ status: "revoked", revokedBy: "64b000000000000000000001" }) },
      { new: true, runValidators: true }
    );
  });

});
