import { describe, expect, it } from "vitest";
import { mapCareMeshPatientToFhirR4 } from "./patient.mapper.js";
import { fhirR4PatientSchema } from "./patient.schema.js";

const patient = {
  _id: "64b000000000000000000010",
  medicalRecordNumber: "CM-SYNTH-001",
  identifiers: [{ system: "https://hospital.example/mrn", value: "EXT-100" }],
  name: { given: ["Avery", "Taylor"], family: "Sample" },
  birthDate: "1990-05-12T00:00:00.000Z",
  administrativeGender: "unknown" as const,
  telecom: { email: "avery@example.test", phone: "+1-555-0100" },
  address: { line: ["100 Example Street"], city: "Sample City", region: "CA", postalCode: "90000", country: "US" },
  status: "active" as const
};

describe("FHIR R4 Patient mapping", () => {
  it("maps CareMesh patient fields into the supported FHIR R4 representation", () => {
    expect(mapCareMeshPatientToFhirR4(patient)).toEqual({
      resourceType: "Patient",
      id: patient._id,
      identifier: [
        { use: "usual", system: "urn:caremesh:medical-record-number", value: "CM-SYNTH-001" },
        { system: "https://hospital.example/mrn", value: "EXT-100" }
      ],
      active: true,
      name: [{ use: "official", family: "Sample", given: ["Avery", "Taylor"] }],
      telecom: [{ system: "phone", value: "+1-555-0100" }, { system: "email", value: "avery@example.test" }],
      gender: "unknown",
      birthDate: "1990-05-12",
      address: [{ line: ["100 Example Street"], city: "Sample City", state: "CA", postalCode: "90000", country: "US" }]
    });
  });

  it("maps inactive and merged patients as inactive", () => {
    expect(mapCareMeshPatientToFhirR4({ ...patient, status: "merged" }).active).toBe(false);
  });

  it("rejects malformed or unsupported FHIR resource shapes", () => {
    expect(fhirR4PatientSchema.safeParse({ resourceType: "Observation" }).success).toBe(false);
    expect(fhirR4PatientSchema.safeParse({ resourceType: "Patient", unexpected: true }).success).toBe(false);
    expect(fhirR4PatientSchema.safeParse({ resourceType: "Patient", gender: "not-a-gender" }).success).toBe(false);
  });
});
