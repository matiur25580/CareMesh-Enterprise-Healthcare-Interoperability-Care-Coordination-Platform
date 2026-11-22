import { fhirR4ObservationSchema, type FhirR4Observation } from "./observation.schema.js";

type CareMeshObservationRecord = {
  _id: unknown;
  patientId: unknown;
  code: { system?: string | null; value?: string | null; display: string };
  status: "active" | "inactive" | "resolved" | "entered_in_error";
  effectiveAt: Date | string;
  createdAt?: Date | string;
  note?: string | null;
};

const statusMap: Record<CareMeshObservationRecord["status"], FhirR4Observation["status"]> = {
  active: "final",
  inactive: "cancelled",
  resolved: "final",
  entered_in_error: "entered-in-error"
};

function toIso(value: Date | string, field: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Observation " + field + " is invalid");
  return date.toISOString();
}

export function mapCareMeshObservationToFhirR4(record: CareMeshObservationRecord): FhirR4Observation {
  if (!record.code?.display) throw new Error("Observation code display is required");
  const coding = record.code.value
    ? [{ system: record.code.system || undefined, code: record.code.value, display: record.code.display }]
    : undefined;
  return fhirR4ObservationSchema.parse({
    resourceType: "Observation",
    id: String(record._id),
    status: statusMap[record.status],
    code: { coding, text: record.code.display },
    subject: { reference: "Patient/" + String(record.patientId) },
    effectiveDateTime: toIso(record.effectiveAt, "effectiveAt"),
    issued: record.createdAt ? toIso(record.createdAt, "createdAt") : undefined,
    note: record.note ? [{ text: record.note }] : undefined
  });
}
