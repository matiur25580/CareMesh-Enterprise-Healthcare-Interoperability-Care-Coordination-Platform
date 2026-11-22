import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.enum(["ok", "degraded", "unavailable"]),
  service: z.string().min(1),
  timestamp: z.string().datetime()
});
export type HealthStatus = z.infer<typeof healthStatusSchema>;
