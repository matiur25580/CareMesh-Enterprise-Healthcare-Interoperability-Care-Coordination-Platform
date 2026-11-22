import { z } from "zod";

export const patientIdentifierSchema = z.object({
  system: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120)
});
export const patientNameSchema = z.object({
  given: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
  family: z.string().trim().min(1).max(100)
});
export const patientSummarySchema = z.object({
  id: z.string().min(1),
  medicalRecordNumber: z.string().min(1).max(64),
  name: patientNameSchema,
  birthDate: z.string().datetime().or(z.string().date()),
  administrativeGender: z.enum(["female", "male", "other", "unknown"]),
  status: z.enum(["active", "inactive", "merged"])
});
export const clinicalResourceTypeSchema = z.enum([
  "condition", "allergy_intolerance", "medication_statement", "observation", "procedure", "encounter", "clinical_note"
]);
export type PatientIdentifier = z.infer<typeof patientIdentifierSchema>;
export type PatientSummary = z.infer<typeof patientSummarySchema>;
export type ClinicalResourceType = z.infer<typeof clinicalResourceTypeSchema>;
