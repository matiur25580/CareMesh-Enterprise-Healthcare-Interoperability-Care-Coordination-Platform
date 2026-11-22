import { fhirR4ConditionSchema, type FhirR4Condition } from "./condition.schema.js";

type CareMeshConditionRecord = {
  _id: unknown;
  patientId: unknown;
  code?: { system?: string | null; value?: string | null; display: string } | null;
  status: "active" | "inactive" | "resolved" | "entered_in_error";
  effectiveAt: Date | string;
  createdAt?: Date | string;
  note?: string | null;
};

const clinicalStatus: Record<Exclude<CareMeshConditionRecord["status"], "entered_in_error">, FhirR4Condition["clinicalStatus"]> = {
  active: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }], text: "Active" },
  inactive: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "inactive" }], text: "Inactive" },
  resolved: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "resolved" }], text: "Resolved" }
};

function toIso(value: Date | string, field: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Condition " + field + " is invalid");
  return date.toISOString();
}

export function mapCareMeshConditionToFhirR4(record: CareMeshConditionRecord): FhirR4Condition {
  if (!record.code?.display) throw new Error("Condition code display is required");
  const coding = record.code.value
    ? [{ system: record.code.system || undefined, code: record.code.value, display: record.code.display }]
    : undefined;
  return fhirR4ConditionSchema.parse({
    resourceType: "Condition",
    id: String(record._id),
    clinicalStatus: record.status === "entered_in_error" ? undefined : clinicalStatus[record.status],
    verificationStatus: record.status === "entered_in_error"
      ? { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "entered-in-error" }], text: "Entered in error" }
      : undefined,
    code: { coding, text: record.code.display },
    subject: { reference: "Patient/" + String(record.patientId) },
    onsetDateTime: toIso(record.effectiveAt, "effectiveAt"),
    recordedDate: toIso(record.createdAt ?? record.effectiveAt, "createdAt"),
    note: record.note ? [{ text: record.note }] : undefined
  });
}
