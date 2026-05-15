import { z } from "zod";

export const workerHandoverLaneSchema = z.enum([
  "active_received",
  "active_given",
  "reverted",
  "history",
]);

export const managerHandoverLaneSchema = z.enum([
  "active",
  "reverted",
  "history",
]);

export const workerHandoverEventTypeSchema = z.enum([
  "handover_out",
  "handover_in",
  "reverted",
  "cancelled",
]);

export const workerHandoverListQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const workerHandoverSummarySchema = z.object({
  canRevert: z.boolean(),
  currentWorkerName: z.string(),
  currentWorkerSlug: z.string().min(1),
  fromWorkerName: z.string(),
  fromWorkerSlug: z.string().min(1),
  handoverChainId: z.string().uuid(),
  lane: workerHandoverLaneSchema,
  latestEventType: workerHandoverEventTypeSchema,
  locationId: z.string().uuid(),
  locationName: z.string(),
  primaryImageUrl: z.string().nullable().optional(),
  productName: z.string(),
  productSlug: z.string(),
  quantity: z.number().int().min(1),
  sku: z.string(),
  skuId: z.string().uuid(),
  startedAt: z.iso.datetime(),
  toWorkerName: z.string(),
  toWorkerSlug: z.string().min(1),
  updatedAt: z.iso.datetime(),
  variantName: z.string(),
  variantSlug: z.string(),
});

export const workerHandoverLaneCountsSchema = z.object({
  active_given: z.number().int().min(0),
  active_received: z.number().int().min(0),
  history: z.number().int().min(0),
  reverted: z.number().int().min(0),
});

export const workerHandoverListResponseSchema = z.object({
  items: z.array(workerHandoverSummarySchema),
  laneCounts: workerHandoverLaneCountsSchema,
  locationId: z.string().uuid(),
  locationName: z.string(),
});

export const managerHandoverListQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const managerHandoverSummarySchema = workerHandoverSummarySchema.extend({
  lane: managerHandoverLaneSchema,
});

export const managerHandoverLaneCountsSchema = z.object({
  active: z.number().int().min(0),
  history: z.number().int().min(0),
  reverted: z.number().int().min(0),
});

export const managerHandoverListResponseSchema = z.object({
  items: z.array(managerHandoverSummarySchema),
  laneCounts: managerHandoverLaneCountsSchema,
  locationId: z.string().uuid(),
  locationName: z.string(),
});

export const handoverRecipientListQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const handoverRecipientSummarySchema = z.object({
  activeAssignmentCount: z.number().int().min(0),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  primaryImageUrl: z.string().nullable().optional(),
  userId: z.string().uuid(),
  userSlug: z.string().min(1),
});

export const handoverRecipientListResponseSchema = z.object({
  items: z.array(handoverRecipientSummarySchema),
  locationId: z.string().uuid(),
  locationName: z.string(),
});

export type HandoverRecipientListQuery = z.infer<
  typeof handoverRecipientListQuerySchema
>;
export type HandoverRecipientSummary = z.infer<
  typeof handoverRecipientSummarySchema
>;
export type HandoverRecipientListResponse = z.infer<
  typeof handoverRecipientListResponseSchema
>;
export type ManagerHandoverLane = z.infer<typeof managerHandoverLaneSchema>;
export type ManagerHandoverListQuery = z.infer<
  typeof managerHandoverListQuerySchema
>;
export type ManagerHandoverSummary = z.infer<
  typeof managerHandoverSummarySchema
>;
export type ManagerHandoverLaneCounts = z.infer<
  typeof managerHandoverLaneCountsSchema
>;
export type ManagerHandoverListResponse = z.infer<
  typeof managerHandoverListResponseSchema
>;
export type WorkerHandoverLane = z.infer<typeof workerHandoverLaneSchema>;
export type WorkerHandoverListQuery = z.infer<
  typeof workerHandoverListQuerySchema
>;
export type WorkerHandoverSummary = z.infer<typeof workerHandoverSummarySchema>;
export type WorkerHandoverLaneCounts = z.infer<
  typeof workerHandoverLaneCountsSchema
>;
export type WorkerHandoverListResponse = z.infer<
  typeof workerHandoverListResponseSchema
>;
