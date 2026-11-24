import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ConsentEvaluation } from "../src/models/ConsentEvaluation";
import { consentRouter } from "../src/routes/consent";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required for MongoDB integration tests.");

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const tenantId = req.header("x-test-tenant") ?? "org-a";
  const role = req.header("x-test-role") ?? "clinician";
  (req as typeof req & { auth: { tenantId: string; userId: string; role: string } }).auth = { tenantId, userId: "synthetic-integration-operator", role };
  next();
});
app.use("/api/consent", consentRouter);

describe("CareMesh synthetic consent MongoDB integration", () => {
  beforeAll(async () => {
    await mongoose.connect(uri!, { serverSelectionTimeoutMS: 10000 });
    await mongoose.connection.dropDatabase();
    await ConsentEvaluation.syncIndexes();
  });
  beforeEach(async () => { await ConsentEvaluation.deleteMany({}); });
  afterAll(async () => { await mongoose.disconnect(); });

  const validRequest = () => ({
    consentStatus: "active",
    requestedPurpose: "treatment",
    permittedPurposes: ["treatment"],
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 60_000).toISOString()
  });

  it("persists synthetic decisions and isolates history by organization", async () => {
    expect((await request(app).post("/api/consent/evaluate").set("x-test-tenant", "org-a").send(validRequest())).status).toBe(200);
    expect((await request(app).post("/api/consent/evaluate").set("x-test-tenant", "org-b").send({ ...validRequest(), requestedPurpose: "billing", permittedPurposes: ["billing"] })).status).toBe(200);

    const orgA = await request(app).get("/api/consent/history").set("x-test-tenant", "org-a");
    const orgB = await request(app).get("/api/consent/history").set("x-test-tenant", "org-b");
    expect(orgA.status).toBe(200);
    expect(orgA.body.items).toHaveLength(1);
    expect(orgA.body.items[0].requestedPurpose).toBe("treatment");
    expect(orgB.body.items).toHaveLength(1);
    expect(orgB.body.items[0].requestedPurpose).toBe("billing");
    expect(orgA.body.items[0]).not.toHaveProperty("subjectRef");
    expect(orgA.body.items[0]).not.toHaveProperty("patientId");
  });

  it("stores denied decisions with reason codes", async () => {
    const response = await request(app).post("/api/consent/evaluate").send({
      ...validRequest(), requestedPurpose: "payment", permittedPurposes: ["treatment"]
    });
    expect(response.status).toBe(200);
    expect(response.body.decision).toBe("deny");
    const stored = await ConsentEvaluation.findOne({ tenantId: "org-a" }).lean();
    expect(stored?.decision).toBe("deny");
    expect(stored?.reasons).toContain("purpose-not-permitted");
  });

  it("keeps auditors read-only", async () => {
    const response = await request(app).post("/api/consent/evaluate").set("x-test-role", "auditor").send(validRequest());
    expect(response.status).toBe(403);
    expect(await ConsentEvaluation.countDocuments()).toBe(0);
  });
});
