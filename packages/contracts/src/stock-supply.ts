import { z } from "zod";

export const supplyRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "dispatched",
  "received",
  "rejected",
  "cancelled",
]);

export const sourceReservationStatusSchema = z.enum([
  "active",
  "confirmed",
  "released",
  "expired",
  "cancelled",
]);

export const gtnStatusSchema = z.enum(["dispatched", "received", "cancelled"]);

// Worker creates a request specifying source location and what they need
export const createStockSupplyRequestSchema = z.object({
  sourceLocationId: z.string().uuid(),
  locationId: z.string().uuid(), // destination (requester's location)
  skuId: z.string().uuid(),
  requestedQuantity: z.number().int().min(1),
  notes: z.string().trim().max(500).optional(),
});

// Source location manager approves with actual quantity they can send
export const approveStockSupplyRequestSchema = z.object({
  approvedQuantity: z.number().int().min(1),
  resolutionNotes: z.string().trim().max(500).optional(),
});

// Source location manager rejects
export const rejectStockSupplyRequestSchema = z.object({
  resolutionNotes: z.string().trim().max(500).optional(),
});

// Source location manager dispatches (creates GTN, deducts source stock)
export const dispatchStockSupplyRequestSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

// Worker at destination confirms receipt (updates destination stock)
export const confirmReceiptSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export const stockSupplyRequestResponseSchema = z.object({
  reference: z.string(),
  supplyRequestId: z.string().uuid(),
  transferReference: z.string().nullable(),
  sourceReservationStatus: sourceReservationStatusSchema.nullable(),

  requesterId: z.string().uuid(),
  requesterName: z.string().nullable(),
  requesterEmail: z.string().nullable(),

  locationId: z.string().uuid(),
  locationName: z.string().nullable(),

  sourceLocationId: z.string().uuid(),
  sourceLocationName: z.string().nullable(),

  skuId: z.string().uuid(),
  skuSnapshot: z.object({
    sku: z.string(),
    productName: z.string(),
    variantName: z.string(),
  }),

  requestedQuantity: z.number().int(),
  approvedQuantity: z.number().int().nullable(),

  status: supplyRequestStatusSchema,
  notes: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  resolvedBy: z.string().uuid().nullable(),
  resolvedAt: z.iso.datetime().nullable(),

  dispatchedBy: z.string().uuid().nullable(),
  dispatchedAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime().nullable(),

  // GTN reference (available once dispatched)
  gtnReference: z.string().nullable(),

  createdAt: z.iso.datetime(),
});

export const stockSupplyRequestListResponseSchema = z.object({
  items: z.array(stockSupplyRequestResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const stockSupplyRequestListQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  sourceLocationId: z.string().uuid().optional(),
  status: supplyRequestStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const supplyRequestSourceListQuerySchema = z.object({
  destinationLocationId: z.string().uuid(),
});

export const supplyRequestSourceOptionSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string().min(1).max(160),
});

export const supplyRequestSourceListResponseSchema = z.object({
  items: z.array(supplyRequestSourceOptionSchema),
});

export const gtnResponseSchema = z.object({
  gtnId: z.string().uuid(),
  reference: z.string(),
  supplyRequestId: z.string().uuid(),
  supplyRequestReference: z.string(),
  sourceLocationId: z.string().uuid(),
  sourceLocationName: z.string().nullable(),
  destinationLocationId: z.string().uuid(),
  destinationLocationName: z.string().nullable(),
  skuId: z.string().uuid(),
  skuSnapshot: z.object({
    sku: z.string(),
    productName: z.string(),
    variantName: z.string(),
  }),
  quantity: z.number().int(),
  status: gtnStatusSchema,
  dispatchedBy: z.string().uuid(),
  dispatchedByName: z.string().nullable(),
  dispatchedAt: z.iso.datetime(),
  receivedBy: z.string().uuid().nullable(),
  receivedByName: z.string().nullable(),
  receivedAt: z.iso.datetime().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type SupplyRequestStatus = z.infer<typeof supplyRequestStatusSchema>;
export type SourceReservationStatus = z.infer<
  typeof sourceReservationStatusSchema
>;
export type GtnStatus = z.infer<typeof gtnStatusSchema>;
export type CreateStockSupplyRequest = z.infer<
  typeof createStockSupplyRequestSchema
>;
export type ApproveStockSupplyRequest = z.infer<
  typeof approveStockSupplyRequestSchema
>;
export type RejectStockSupplyRequest = z.infer<
  typeof rejectStockSupplyRequestSchema
>;
export type DispatchStockSupplyRequest = z.infer<
  typeof dispatchStockSupplyRequestSchema
>;
export type ConfirmReceipt = z.infer<typeof confirmReceiptSchema>;
export type StockSupplyRequestResponse = z.infer<
  typeof stockSupplyRequestResponseSchema
>;
export type StockSupplyRequestListResponse = z.infer<
  typeof stockSupplyRequestListResponseSchema
>;
export type StockSupplyRequestListQuery = z.infer<
  typeof stockSupplyRequestListQuerySchema
>;
export type SupplyRequestSourceListQuery = z.infer<
  typeof supplyRequestSourceListQuerySchema
>;
export type SupplyRequestSourceListResponse = z.infer<
  typeof supplyRequestSourceListResponseSchema
>;
export type GtnResponse = z.infer<typeof gtnResponseSchema>;
