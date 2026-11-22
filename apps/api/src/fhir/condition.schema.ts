import { z } from "zod";

// Bounded FHIR R4 Condition subset emitted by the CareMesh mapper.
const coding = z.object({
  system: z.string().url().or(z.string().startsWith("urn:")).optional(),
  code: z.string().min(1).max(100).optional(),
  display: z.string().max(240).optional()
}).strict();

const codeableConcept = z.object({
  coding: z.array(coding).max(5).optional(),
  text: z.string().min(1).max(240)
}).strict();

export const fhirR4ConditionSchema = z.object({
  resourceType: z.literal("Condition"),
  id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/),
  clinicalStatus: codeableConcept.optional(),
  verificationStatus: codeableConcept.optional(),
  code: codeableConcept,
  subject: z.object({ reference: z.string().regex(/^Patient\/[A-Za-z0-9.-]{1,64}$/) }).strict(),
  onsetDateTime: z.string().datetime({ offset: true }).optional(),
  recordedDate: z.string().datetime({ offset: true }),
  note: z.array(z.object({ text: z.string().min(1).max(4000) }).strict()).max(1).optional()
}).strict();

export const fhirR4ConditionBundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  type: z.literal("searchset"),
  total: z.number().int().nonnegative(),
  entry: z.array(z.object({
    fullUrl: z.string().min(1),
    resource: fhirR4ConditionSchema
  }).strict()).max(100)
}).strict();

export type FhirR4Condition = z.infer<typeof fhirR4ConditionSchema>;
