import { z } from "zod";
import { authUserStatusSchema } from "./auth.js";

export const assignVariantRequestSchema = z.object({
  effectiveFrom: z.iso.datetime().optional(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1),
  skuId: z.string().uuid(),
  workerId: z.string().uuid(),
});

export const reassignVariantRequestSchema = z.object({
  locationId: z.string().uuid(),
  skuId: z.string().uuid(),
  toWorkerId: z.string().uuid(),
});

export const initiateHandoverRequestSchema = z.object({
  durationMinutes: z.number().int().min(1).max(10080).optional(),
  fromWorkerId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1),
  skuId: z.string().uuid(),
  toWorkerId: z.string().uuid(),
});

export const revertHandoverRequestSchema = z.object({
  handoverChainId: z.string().uuid(),
});

export const ownershipEventResponseSchema = z.object({
  createdAt: z.iso.datetime(),
  effectiveFrom: z.iso.datetime(),
  eventType: z.enum([
    "assigned",
    "reassigned",
    "handover_out",
    "handover_in",
    "reverted",
    "cancelled",
  ]),
  handoverChainId: z.string().uuid().nullable(),
  locationId: z.string().uuid(),
  quantity: z.number().int(),
  skuId: z.string().uuid(),
  workerId: z.string().uuid(),
});

export const currentAssignmentSchema = z.object({
  availableQuantity: z.number().int(),
  effectiveFrom: z.iso.datetime(),
  locationId: z.string().uuid(),
  onHandQuantity: z.number().int(),
  productName: z.string(),
  productSlug: z.string(),
  quantity: z.number().int(),
  sellingPrice: z.string(),
  sku: z.string(),
  skuId: z.string().uuid(),
  variantName: z.string(),
  variantSlug: z.string(),
  workerId: z.string().uuid(),
});

export const workerAssignmentListResponseSchema = z.object({
  items: z.array(currentAssignmentSchema),
  locationId: z.string().uuid(),
  locationName: z.string(),
});

export const locationAssignmentSummarySchema = z.object({
  effectiveFrom: z.iso.datetime(),
  eventType: z.enum(["assigned", "reassigned", "handover_in"]),
  productName: z.string(),
  quantity: z.number().int(),
  sku: z.string(),
  skuId: z.string().uuid(),
  variantName: z.string(),
  workerEmail: z.string(),
  workerId: z.string().uuid(),
  workerName: z.string(),
});

export const locationAssignmentListResponseSchema = z.object({
  items: z.array(locationAssignmentSummarySchema),
  locationId: z.string().uuid(),
  locationName: z.string(),
});

export const locationAssignmentListQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const workerAssignmentListQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const locationStaffListQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const locationStaffSummarySchema = z.object({
  activeAssignmentCount: z.number().int().min(0),
  assignedAt: z.iso.datetime(),
  email: z.email(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  roleName: z.string().min(1).max(120),
  roleSlug: z.enum(["manager", "worker"]),
  status: authUserStatusSchema,
  userId: z.string().uuid(),
  userSlug: z.string().min(1).max(120),
});

export const locationStaffListResponseSchema = z.object({
  items: z.array(locationStaffSummarySchema),
  locationId: z.string().uuid(),
  locationName: z.string(),
});

export const handoverResponseSchema = z.object({
  handoverChainId: z.string().uuid(),
  handoverInEvent: ownershipEventResponseSchema,
  handoverOutEvent: ownershipEventResponseSchema,
});

export const batchAssignVariantItemSchema = z.object({
  quantity: z.number().int().min(1),
  skuId: z.string().uuid(),
});

export const batchAssignVariantRequestSchema = z.object({
  items: z.array(batchAssignVariantItemSchema).min(1).max(50),
  locationId: z.string().uuid(),
  workerId: z.string().uuid(),
});

export const batchAssignVariantResponseSchema = z.object({
  assignedCount: z.number().int(),
  locationId: z.string().uuid(),
  workerId: z.string().uuid(),
});

export type BatchAssignVariantItem = z.infer<
  typeof batchAssignVariantItemSchema
>;
export type BatchAssignVariantRequest = z.infer<
  typeof batchAssignVariantRequestSchema
>;
export type BatchAssignVariantResponse = z.infer<
  typeof batchAssignVariantResponseSchema
>;
export type AssignVariantRequest = z.infer<typeof assignVariantRequestSchema>;
export type ReassignVariantRequest = z.infer<
  typeof reassignVariantRequestSchema
>;
export type InitiateHandoverRequest = z.infer<
  typeof initiateHandoverRequestSchema
>;
export type RevertHandoverRequest = z.infer<typeof revertHandoverRequestSchema>;
export type OwnershipEventResponse = z.infer<
  typeof ownershipEventResponseSchema
>;
export type CurrentAssignment = z.infer<typeof currentAssignmentSchema>;
export type WorkerAssignmentListResponse = z.infer<
  typeof workerAssignmentListResponseSchema
>;
export type LocationAssignmentSummary = z.infer<
  typeof locationAssignmentSummarySchema
>;
export type LocationAssignmentListResponse = z.infer<
  typeof locationAssignmentListResponseSchema
>;
export type LocationAssignmentListQuery = z.infer<
  typeof locationAssignmentListQuerySchema
>;
export type WorkerAssignmentListQuery = z.infer<
  typeof workerAssignmentListQuerySchema
>;
export type HandoverResponse = z.infer<typeof handoverResponseSchema>;
export type LocationStaffListQuery = z.infer<
  typeof locationStaffListQuerySchema
>;
export type LocationStaffSummary = z.infer<typeof locationStaffSummarySchema>;
export type LocationStaffListResponse = z.infer<
  typeof locationStaffListResponseSchema
>;
