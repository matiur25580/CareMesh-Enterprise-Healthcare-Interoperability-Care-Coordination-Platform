import { describe, expect, it } from "vitest";
import { mapCareMeshConditionToFhirR4 } from "./condition.mapper.js";
import { fhirR4ConditionSchema } from "./condition.schema.js";

const record = {
  _id: "64b000000000000000000020",
  patientId: "64b000000000000000000010",
  code: { system: "http://snomed.info/sct", value: "73211009", display: "Diabetes mellitus" },
  status: "active" as const,
  effectiveAt: "2026-10-01T09:30:00.000Z",
  createdAt: "2026-10-01T09:31:00.000Z",
  note: "Synthetic test condition"
};

describe("FHIR R4 Condition mapping", () => {
  it("maps a coded condition and clinical status", () => {
    expect(mapCareMeshConditionToFhirR4(record)).toEqual({
      resourceType: "Condition",
      id: record._id,
      clinicalStatus: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }],
        text: "Active"
      },
      code: {
        coding: [{ system: "http://snomed.info/sct", code: "73211009", display: "Diabetes mellitus" }],
        text: "Diabetes mellitus"
      },
      subject: { reference: "Patient/" + record.patientId },
      onsetDateTime: record.effectiveAt,
      recordedDate: record.createdAt,
      note: [{ text: record.note }]
    });
  });

  it("maps entered-in-error without incorrectly assigning clinicalStatus", () => {
    const result = mapCareMeshConditionToFhirR4({ ...record, status: "entered_in_error" });
    expect(result.clinicalStatus).toBeUndefined();
    expect(result.verificationStatus?.coding?.[0]?.code).toBe("entered-in-error");
  });

  it("rejects invalid resource identifiers and timestamps", () => {
    expect(fhirR4ConditionSchema.safeParse({
      resourceType: "Condition",
      id: "bad id",
      code: { text: "Condition" },
      subject: { reference: "Patient/123" },
      recordedDate: "not-a-date"
    }).success).toBe(false);
  });
});
