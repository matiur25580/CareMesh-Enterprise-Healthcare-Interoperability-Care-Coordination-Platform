import { z } from "zod";

export const organizationTypeSchema = z.enum([
  "hospital", "clinic", "laboratory", "pharmacy", "payer", "care_network"
]);
export const organizationSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(160),
  type: organizationTypeSchema,
  status: z.enum(["active", "pending", "suspended"])
});
export type OrganizationType = z.infer<typeof organizationTypeSchema>;
export type OrganizationSummary = z.infer<typeof organizationSummarySchema>;
