import { z } from "zod";

// Deliberately bounded FHIR R4 Patient subset. Unknown fields are rejected so
// this contract cannot be mistaken for a complete FHIR resource validator.
const fhirDate = z.string().regex(/^\\d{4}(-\\d{2}(-\\d{2})?)?$/, "Expected a FHIR date");
const humanName = z.object({
  use: z.enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]).optional(),
  text: z.string().max(200).optional(),
  family: z.string().max(100).optional(),
  given: z.array(z.string().max(80)).max(5).optional()
}).strict();
const identifier = z.object({
  use: z.enum(["usual", "official", "temp", "secondary", "old"]).optional(),
  system: z.string().url().or(z.string().startsWith("urn:")).optional(),
  value: z.string().min(1).max(120)
}).strict();
const telecom = z.object({
  system: z.enum(["phone", "email", "fax", "pager", "url", "sms", "other"]),
  value: z.string().min(1).max(254),
  use: z.enum(["home", "work", "temp", "old", "mobile"]).optional()
}).strict();
const address = z.object({
  use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
  line: z.array(z.string().max(160)).max(4).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(2).optional()
}).strict();

export const fhirR4PatientSchema = z.object({
  resourceType: z.literal("Patient"),
  id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).optional(),
  identifier: z.array(identifier).max(21).optional(),
  active: z.boolean().optional(),
  name: z.array(humanName).max(5).optional(),
  telecom: z.array(telecom).max(2).optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birthDate: fhirDate.optional(),
  address: z.array(address).max(1).optional()
}).strict();

export type FhirR4Patient = z.infer<typeof fhirR4PatientSchema>;
