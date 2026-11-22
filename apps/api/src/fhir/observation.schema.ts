import { z } from "zod";

// Bounded FHIR R4 Observation subset emitted by the CareMesh mapper.
const coding = z.object({
  system: z.string().url().or(z.string().startsWith("urn:")).optional(),
  code: z.string().min(1).max(100).optional(),
  display: z.string().max(240).optional()
}).strict();

const codeableConcept = z.object({
  coding: z.array(coding).max(5).optional(),
  text: z.string().min(1).max(240)
}).strict();

export const fhirR4ObservationSchema = z.object({
  resourceType: z.literal("Observation"),
  id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/),
  status: z.enum(["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"]),
  code: codeableConcept,
  subject: z.object({ reference: z.string().regex(/^Patient\/[A-Za-z0-9.-]{1,64}$/) }).strict(),
  effectiveDateTime: z.string().datetime({ offset: true }),
  issued: z.string().datetime({ offset: true }).optional(),
  note: z.array(z.object({ text: z.string().min(1).max(4000) }).strict()).max(1).optional()
}).strict();

export const fhirR4ObservationBundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  type: z.literal("searchset"),
  total: z.number().int().nonnegative(),
  entry: z.array(z.object({
    fullUrl: z.string().min(1),
    resource: fhirR4ObservationSchema
  }).strict()).max(100)
}).strict();

export type FhirR4Observation = z.infer<typeof fhirR4ObservationSchema>;
export type FhirR4ObservationBundle = z.infer<typeof fhirR4ObservationBundleSchema>;
