import { describe, expect, it } from "vitest";
import { z } from "zod";

const patientInput = z.object({
  medicalRecordNumber: z.string().trim().min(1).max(64),
  identifiers: z.array(z.object({ system: z.string().min(1), value: z.string().min(1) })).max(20).default([]),
  name: z.object({ given: z.array(z.string().min(1)).min(1), family: z.string().min(1) }),
  birthDate: z.coerce.date(),
  administrativeGender: z.enum(["female", "male", "other", "unknown"]).default("unknown")
});

describe("patient identity validation", () => {
  it("accepts a minimally complete synthetic patient", () => {
    expect(patientInput.safeParse({
      medicalRecordNumber: "CM-DEMO-001",
      name: { given: ["Avery"], family: "Sample" },
      birthDate: "1990-05-12"
    }).success).toBe(true);
  });
  it("rejects missing names and invalid gender values", () => {
    expect(patientInput.safeParse({ medicalRecordNumber: "X", name: { given: [], family: "" }, birthDate: "1990-05-12" }).success).toBe(false);
    expect(patientInput.safeParse({ medicalRecordNumber: "X", name: { given: ["A"], family: "B" }, birthDate: "1990-05-12", administrativeGender: "not-known" }).success).toBe(false);
  });
});
