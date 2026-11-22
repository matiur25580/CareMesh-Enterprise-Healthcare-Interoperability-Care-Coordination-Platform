import { describe, expect, it } from "vitest";
import { fhirR4PatientSchema } from "./patient.schema.js";

describe("FHIR R4 Patient subset validation", () => {
  it("accepts a minimal Patient resource", () => {
    expect(fhirR4PatientSchema.safeParse({ resourceType: "Patient", gender: "unknown" }).success).toBe(true);
  });

  it("requires the Patient resource type and valid primitive values", () => {
    expect(fhirR4PatientSchema.safeParse({ resourceType: "Person" }).success).toBe(false);
    expect(fhirR4PatientSchema.safeParse({ resourceType: "Patient", gender: "unspecified" }).success).toBe(false);
    expect(fhirR4PatientSchema.safeParse({ resourceType: "Patient", birthDate: "12-05-1990" }).success).toBe(false);
  });
});
