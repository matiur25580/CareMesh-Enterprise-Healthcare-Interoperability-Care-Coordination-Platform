import { fhirR4PatientSchema, type FhirR4Patient } from "./patient.schema.js";

type CareMeshPatient = {
  _id: unknown;
  medicalRecordNumber: string;
  identifiers?: Array<{ system: string; value: string }>;
  name: { given: string[]; family: string };
  birthDate: Date | string;
  administrativeGender: "female" | "male" | "other" | "unknown";
  telecom?: { email?: string; phone?: string };
  address?: { line?: string[]; city?: string; region?: string; postalCode?: string; country?: string };
  status: "active" | "inactive" | "merged";
};

export function mapCareMeshPatientToFhirR4(patient: CareMeshPatient): FhirR4Patient {
  const birthDate = new Date(patient.birthDate);
  if (Number.isNaN(birthDate.getTime())) throw new Error("Patient birthDate is invalid");
  const resource = {
    resourceType: "Patient" as const,
    id: String(patient._id),
    identifier: [
      { use: "usual" as const, system: "urn:caremesh:medical-record-number", value: patient.medicalRecordNumber },
      ...(patient.identifiers ?? []).map((item) => ({ system: item.system, value: item.value }))
    ],
    active: patient.status === "active",
    name: [{ use: "official" as const, family: patient.name.family, given: patient.name.given }],
    telecom: [
      ...(patient.telecom?.phone ? [{ system: "phone" as const, value: patient.telecom.phone }] : []),
      ...(patient.telecom?.email ? [{ system: "email" as const, value: patient.telecom.email }] : [])
    ],
    gender: patient.administrativeGender,
    birthDate: birthDate.toISOString().slice(0, 10),
    address: patient.address ? [{
      line: patient.address.line,
      city: patient.address.city,
      state: patient.address.region,
      postalCode: patient.address.postalCode,
      country: patient.address.country
    }] : undefined
  };
  return fhirR4PatientSchema.parse(resource);
}
