import { z } from "zod";

export const platformEventDeliveryStatusSchema = z.enum([
  "pending",
  "processing",
  "delivered",
  "failed",
]);

export const platformEventDeliveryStatusCountSchema = z.object({
  count: z.number().int().min(0),
  status: platformEventDeliveryStatusSchema,
});

export const platformEventDeliveryHealthResponseSchema = z.object({
  deliveredCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  generatedAt: z.iso.datetime(),
  oldestFailedAt: z.iso.datetime().nullable(),
  oldestPendingAt: z.iso.datetime().nullable(),
  pendingCount: z.number().int().min(0),
  processingCount: z.number().int().min(0),
  statusCounts: z.array(platformEventDeliveryStatusCountSchema),
  stuckProcessingCount: z.number().int().min(0),
});

export type PlatformEventDeliveryHealthResponse = z.infer<
  typeof platformEventDeliveryHealthResponseSchema
>;
export type PlatformEventDeliveryStatus = z.infer<
  typeof platformEventDeliveryStatusSchema
>;
