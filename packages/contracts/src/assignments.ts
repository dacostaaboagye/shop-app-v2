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

export const assignmentHistoryQuerySchema = z.object({
  locationId: z.string().uuid(),
  skuId: z.string().uuid(),
});

export const assignmentHistoryEventSchema = z.object({
  actorName: z.string(),
  actorSlug: z.string(),
  createdAt: z.iso.datetime(),
  effectiveFrom: z.iso.datetime(),
  eventType: ownershipEventResponseSchema.shape.eventType,
  handoverChainId: z.string().uuid().nullable(),
  quantity: z.number().int(),
  workerName: z.string(),
  workerSlug: z.string(),
});

export const assignmentHistoryResponseSchema = z.object({
  items: z.array(assignmentHistoryEventSchema),
  locationId: z.string().uuid(),
  locationName: z.string(),
  locationSlug: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  sku: z.string(),
  skuId: z.string().uuid(),
  variantName: z.string(),
  variantSlug: z.string(),
});

export const currentAssignmentSchema = z.object({
  availableQuantity: z.number().int(),
  brandName: z.string().nullable().optional(),
  brandSlug: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  categorySlug: z.string().nullable().optional(),
  effectiveFrom: z.iso.datetime(),
  locationId: z.string().uuid(),
  onHandQuantity: z.number().int(),
  primaryImageUrl: z.string().nullable().optional(),
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
  lastSaleAt: z.iso.datetime().nullable().default(null),
  netSalesAmount: z.string().default("0.00"),
  primaryImageUrl: z.string().nullable().optional(),
  roleName: z.string().min(1).max(120),
  roleSlug: z.enum(["manager", "worker"]),
  returnsCount: z.number().int().min(0).default(0),
  returnsTotalAmount: z.string().default("0.00"),
  salesCount: z.number().int().min(0).default(0),
  salesTotalAmount: z.string().default("0.00"),
  status: authUserStatusSchema,
  userId: z.string().uuid(),
  userSlug: z.string().min(1).max(120),
});

export const locationStaffListResponseSchema = z.object({
  items: z.array(locationStaffSummarySchema),
  locationId: z.string().uuid(),
  locationName: z.string(),
});

const staffProvisioningNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/[<>]/.test(value), {
    message: "Name cannot include angle brackets.",
  });

export const managerCreateWorkerRequestSchema = z.object({
  email: z.email().max(254),
  firstName: staffProvisioningNameSchema,
  lastName: staffProvisioningNameSchema,
  locationSlugs: z.array(z.string().trim().min(1).max(120)).min(1).max(10),
  reason: z.string().trim().min(1).max(500),
});

export const managerCreateWorkerResponseSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  locationSlugs: z.array(z.string().min(1).max(120)).min(1).max(10),
  requiresPasswordChange: z.boolean(),
  setupInstruction: z.string().min(1),
  slug: z.string().min(1).max(120),
  status: authUserStatusSchema,
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
export type AssignmentHistoryQuery = z.infer<
  typeof assignmentHistoryQuerySchema
>;
export type AssignmentHistoryEvent = z.infer<
  typeof assignmentHistoryEventSchema
>;
export type AssignmentHistoryResponse = z.infer<
  typeof assignmentHistoryResponseSchema
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
export type ManagerCreateWorkerRequest = z.infer<
  typeof managerCreateWorkerRequestSchema
>;
export type ManagerCreateWorkerResponse = z.infer<
  typeof managerCreateWorkerResponseSchema
>;
