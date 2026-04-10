import { z } from "zod";

export const activeReservationListQuerySchema = z.object({
  expiresAfter: z.iso.datetime().optional(),
  expiresBefore: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  locationId: z.string().uuid(),
  skuId: z.string().uuid().optional(),
  sourceType: z.string().trim().min(1).max(64).optional(),
});

export const activeReservationSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  skuId: z.string().uuid(),
  sourceKey: z.string().min(1).max(160),
  sourceType: z.string().min(1).max(64),
  status: z.literal("active"),
  updatedAt: z.iso.datetime(),
});

export const activeReservationListResponseSchema = z.object({
  items: z.array(activeReservationSummarySchema),
});

export type ActiveReservationListQuery = z.infer<
  typeof activeReservationListQuerySchema
>;
export type ActiveReservationListResponse = z.infer<
  typeof activeReservationListResponseSchema
>;
export type ActiveReservationSummary = z.infer<
  typeof activeReservationSummarySchema
>;
