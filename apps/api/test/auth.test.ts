import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/models/User", () => ({ User: { findOne: vi.fn() } }));
import { User } from "../src/models/User";
import { authenticate } from "../src/middleware/authenticate";
import { authorize } from "../src/middleware/authorize";
const secret = "unit-test-secret-that-is-long-enough-for-hmac";
const app = express();
app.get("/protected", authenticate, authorize("organization-admin"), (req, res) => res.json({ tenantId: req.auth!.tenantId }));
function token(claims: Record<string, unknown> = {}) {
  return jwt.sign({ tenantId: "org-a", role: "organization-admin", ...claims }, secret, { subject: "user-1", issuer: "caremesh-api", audience: "caremesh-client", expiresIn: "5m" });
}
describe("CareMesh authentication and authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("JWT_SECRET", secret); });
  it("rejects missing bearer tokens", async () => {
    const response = await request(app).get("/protected");
    expect(response.status).toBe(401);
    expect(User.findOne).not.toHaveBeenCalled();
  });
  it("revalidates account and tenant before granting access", async () => {
    const select = vi.fn().mockResolvedValue({ _id: "user-1", tenantId: "org-a", role: "organization-admin" });
    vi.mocked(User.findOne).mockReturnValue({ select } as never);
    const response = await request(app).get("/protected").set("Authorization", `Bearer ${token()}`);
    expect(response.status).toBe(200);
    expect(response.body.tenantId).toBe("org-a");
    expect(User.findOne).toHaveBeenCalledWith({ _id: "user-1", tenantId: "org-a", active: true });
  });
  it("rejects inactive accounts", async () => {
    const select = vi.fn().mockResolvedValue(null);
    vi.mocked(User.findOne).mockReturnValue({ select } as never);
    const response = await request(app).get("/protected").set("Authorization", `Bearer ${token()}`);
    expect(response.status).toBe(401);
  });
  it("rejects expired tokens", async () => {
    const expired = jwt.sign({ tenantId: "org-a" }, secret, { subject: "user-1", issuer: "caremesh-api", audience: "caremesh-client", expiresIn: -1 });
    const response = await request(app).get("/protected").set("Authorization", `Bearer ${expired}`);
    expect(response.status).toBe(401);
  });
  it("blocks roles that are not authorized for the route", async () => {
    const select = vi.fn().mockResolvedValue({ _id: "user-1", tenantId: "org-a", role: "patient" });
    vi.mocked(User.findOne).mockReturnValue({ select } as never);
    const response = await request(app).get("/protected").set("Authorization", `Bearer ${token({ role: "patient" })}`);
    expect(response.status).toBe(403);
  });
});