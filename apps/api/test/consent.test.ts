import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/models/ConsentEvaluation", () => ({ ConsentEvaluation: { find: vi.fn(), create: vi.fn() } }));
import { ConsentEvaluation } from "../src/models/ConsentEvaluation";
import { consentRouter } from "../src/routes/consent";
const find = vi.mocked(ConsentEvaluation.find);
const create = vi.mocked(ConsentEvaluation.create);
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as typeof req & { auth: { tenantId: string; userId: string; role: string } }).auth = { tenantId: req.header("x-test-tenant") ?? "org-a", userId: "synthetic-operator", role: "clinician" };
  next();
});
app.use("/api/consent", consentRouter);
describe("synthetic consent decision audit", () => {
  beforeEach(() => vi.clearAllMocks());
  it("denies an unpermitted purpose and records a tenant-scoped rationale", async () => {
    create.mockResolvedValue({} as never);
    const response = await request(app).post("/api/consent/evaluate").send({
      consentStatus: "active", requestedPurpose: "payment", permittedPurposes: ["treatment"],
      validFrom: new Date(Date.now()-60000).toISOString(), validUntil: new Date(Date.now()+60000).toISOString()
    });
    expect(response.status).toBe(200); expect(response.body.decision).toBe("deny");
    expect(response.body.reasons).toContain("purpose-not-permitted");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "org-a", actorUserId: "synthetic-operator", decision: "deny" }));
    expect(create.mock.calls[0][0]).not.toHaveProperty("subjectRef");
  });
  it("allows only active, in-window, explicitly permitted purposes", async () => {
    create.mockResolvedValue({} as never);
    const response = await request(app).post("/api/consent/evaluate").send({
      consentStatus: "active", requestedPurpose: "treatment", permittedPurposes: ["treatment"],
      validFrom: new Date(Date.now()-60000).toISOString(), validUntil: new Date(Date.now()+60000).toISOString()
    });
    expect(response.status).toBe(200); expect(response.body.decision).toBe("allow");
  });
  it("rejects malformed and extra fields", async () => {
    const response = await request(app).post("/api/consent/evaluate").send({
      consentStatus: "active", requestedPurpose: "treatment", permittedPurposes: ["treatment"],
      validFrom: "yesterday", validUntil: "tomorrow", patientName: "not-accepted"
    });
    expect(response.status).toBe(400); expect(create).not.toHaveBeenCalled();
  });
  it("scopes history queries to the authenticated organization", async () => {
    const query = { sort: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) };
    find.mockReturnValue(query as never);
    const response = await request(app).get("/api/consent/history?limit=25");
    expect(response.status).toBe(200); expect(find).toHaveBeenCalledWith({ tenantId: "org-a" });
    expect(query.limit).toHaveBeenCalledWith(25);
  });
});