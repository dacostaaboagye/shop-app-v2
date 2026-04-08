import { z } from "zod";

export const healthResponseSchema = z.object({
  name: z.string(),
  status: z.literal("ok"),
  utcTime: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
