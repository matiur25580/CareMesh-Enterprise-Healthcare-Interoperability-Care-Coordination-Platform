import { beforeEach, describe, expect, it, vi } from "vitest";

const { exists } = vi.hoisted(() => ({ exists: vi.fn() }));
vi.mock("../models/consent.model.js", () => ({
  ConsentModel: { exists },
  CONSENT_PURPOSES: ["treatment", "payment", "operations"]
}));

import { hasActiveConsent, parseConsentPurpose } from "./consent.service.js";

describe("consent purpose evaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts only supported explicit purposes", () => {
    expect(parseConsentPurpose("treatment")).toBe("treatment");
    expect(parseConsentPurpose("payment")).toBe("payment");
    expect(parseConsentPurpose("operations")).toBe("operations");
    expect(parseConsentPurpose(undefined)).toBeNull();
    expect(parseConsentPurpose("research")).toBeNull();
  });

  it("checks active, unrevoked consent for the same tenant, patient, and purpose", async () => {
    exists.mockResolvedValue({ _id: "consent-id" });
    const at = new Date("2026-11-22T12:00:00.000Z");

    await expect(hasActiveConsent({
      organizationId: "org-id",
      patientId: "patient-id",
      purpose: "treatment",
      at
    })).resolves.toBe(true);

    expect(exists).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-id",
      patientId: "patient-id",
      status: "active",
      purposes: "treatment",
      effectiveAt: { $lte: at },
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: at } }]
    }));
  });

  it("denies when no matching active consent exists", async () => {
    exists.mockResolvedValue(null);
    await expect(hasActiveConsent({
      organizationId: "org-id",
      patientId: "patient-id",
      purpose: "payment"
    })).resolves.toBe(false);
  });
});
