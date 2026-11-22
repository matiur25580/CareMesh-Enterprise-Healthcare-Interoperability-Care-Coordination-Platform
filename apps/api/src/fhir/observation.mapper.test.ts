import { describe, expect, it } from "vitest";
import { mapCareMeshObservationToFhirR4 } from "./observation.mapper.js";
import { fhirR4ObservationSchema } from "./observation.schema.js";

const record = {
  _id: "64b000000000000000000020",
  patientId: "64b000000000000000000010",
  code: { system: "http://loinc.org", value: "8867-4", display: "Heart rate" },
  status: "active" as const,
  effectiveAt: "2026-10-01T09:30:00.000Z",
  createdAt: "2026-10-01T09:31:00.000Z",
  note: "Synthetic test observation"
};

describe("FHIR R4 Observation mapping", () => {
  it("maps CareMesh observation metadata into a FHIR Observation", () => {
    expect(mapCareMeshObservationToFhirR4(record)).toEqual({
      resourceType: "Observation",
      id: record._id,
      status: "final",
      code: {
        coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }],
        text: "Heart rate"
      },
      subject: { reference: "Patient/" + record.patientId },
      effectiveDateTime: "2026-10-01T09:30:00.000Z",
      issued: "2026-10-01T09:31:00.000Z",
      note: [{ text: "Synthetic test observation" }]
    });
  });

  it("maps entered-in-error records to the FHIR status", () => {
    expect(mapCareMeshObservationToFhirR4({ ...record, status: "entered_in_error" }).status)
      .toBe("entered-in-error");
  });

  it("rejects malformed FHIR output", () => {
    expect(fhirR4ObservationSchema.safeParse({
      resourceType: "Observation",
      id: "obs-1",
      status: "active",
      code: { text: "Heart rate" },
      subject: { reference: "Patient/123" },
      effectiveDateTime: "not-a-date"
    }).success).toBe(false);
  });
});
