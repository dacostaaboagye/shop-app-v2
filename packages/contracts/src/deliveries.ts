import { z } from "zod";

export const deliverySourceTypeSchema = z.enum([
  "pos_sale",
  "online_order",
  "transfer",
]);

export const deliveryStatusSchema = z.enum([
  "draft",
  "assigned",
  "in_transit",
  "completed",
  "cancelled",
]);

export const deliveryAddressSnapshotSchema = z.object({
  contactName: z.string().trim().min(1).max(160),
  contactPhone: z.string().trim().min(1).max(40),
  contactEmail: z.string().trim().email().max(160).nullable().default(null),
  addressLines: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().min(1).max(80).nullable().default(null),
  postalCode: z.string().trim().min(1).max(20).nullable().default(null),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Z]{2}$/, "country code must be ISO-3166-1 alpha-2 uppercase"),
  notes: z.string().trim().max(500).nullable().default(null),
});

export const createDeliveryFromPosSaleRequestSchema = z.object({
  invoiceReference: z.string().trim().min(1).max(64),
  destination: deliveryAddressSnapshotSchema,
});

export const createDeliveryFromOnlineOrderRequestSchema = z.object({
  orderReference: z.string().trim().min(1).max(64),
  destination: deliveryAddressSnapshotSchema,
});

export const createDeliveryFromTransferRequestSchema = z.object({
  transferReference: z.string().trim().min(1).max(64),
});

export const deliveryItemResponseSchema = z.object({
  deliveryItemId: z.string().uuid(),
  itemReference: z.string().min(1),
  skuId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const deliveryDestinationResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("location"), locationId: z.string().uuid() }),
  z.object({
    kind: z.literal("external"),
    snapshot: deliveryAddressSnapshotSchema,
  }),
]);

export const deliveryResponseSchema = z.object({
  deliveryId: z.string().uuid(),
  sourceType: deliverySourceTypeSchema,
  sourceReference: z.string().min(1),
  status: deliveryStatusSchema,
  originLocationId: z.string().uuid(),
  destination: deliveryDestinationResponseSchema,
  items: z.array(deliveryItemResponseSchema).min(1),
  assignedUserId: z.string().uuid().nullable(),
  assignedAt: z.string().datetime().nullable(),
  dispatchedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid(),
});

export const assignDeliveryRequestSchema = z.object({
  assignedUserId: z.string().uuid(),
});

export const dispatchDeliveryRequestSchema = z.object({}).strict();

export const completeDeliveryRequestSchema = z.object({}).strict();

export const cancelDeliveryRequestSchema = z.object({
  reason: z.string().trim().min(1).max(240),
});

export const deliveryTransitionResponseSchema = z.object({
  delivery: deliveryResponseSchema,
  status: z.enum(["transitioned", "noop"]),
  fromStatus: deliveryStatusSchema,
  toStatus: deliveryStatusSchema,
});

export type AssignDeliveryRequest = z.infer<typeof assignDeliveryRequestSchema>;
export type DispatchDeliveryRequest = z.infer<
  typeof dispatchDeliveryRequestSchema
>;
export type CompleteDeliveryRequest = z.infer<
  typeof completeDeliveryRequestSchema
>;
export type CancelDeliveryRequest = z.infer<typeof cancelDeliveryRequestSchema>;
export type DeliveryTransitionResponse = z.infer<
  typeof deliveryTransitionResponseSchema
>;

export const DELIVERY_STATUS_CHANGED_EVENT_TYPE = "delivery.status_changed";

export type DeliverySourceType = z.infer<typeof deliverySourceTypeSchema>;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type DeliveryAddressSnapshot = z.infer<
  typeof deliveryAddressSnapshotSchema
>;
export type DeliveryDestinationResponse = z.infer<
  typeof deliveryDestinationResponseSchema
>;
export type DeliveryItemResponse = z.infer<typeof deliveryItemResponseSchema>;
export type DeliveryResponse = z.infer<typeof deliveryResponseSchema>;
export type CreateDeliveryFromPosSaleRequest = z.infer<
  typeof createDeliveryFromPosSaleRequestSchema
>;
export type CreateDeliveryFromOnlineOrderRequest = z.infer<
  typeof createDeliveryFromOnlineOrderRequestSchema
>;
export type CreateDeliveryFromTransferRequest = z.infer<
  typeof createDeliveryFromTransferRequestSchema
>;

export const DELIVERY_ERROR_CODES = {
  sourceNotFound: "delivery_source_not_found",
  invalidSourceState: "delivery_source_state_invalid",
  sourceConflict: "delivery_source_conflict",
  insufficientOriginStock: "delivery_insufficient_origin_stock",
  invalidDestination: "delivery_invalid_destination",
  partialUnsupported: "delivery_partial_unsupported",
  illegalTransition: "delivery_illegal_status_transition",
  terminalStatus: "delivery_terminal_status",
  statusConflict: "delivery_status_conflict",
  assignmentRequired: "delivery_assignment_required",
} as const;

export type DeliveryErrorCode =
  (typeof DELIVERY_ERROR_CODES)[keyof typeof DELIVERY_ERROR_CODES];

export type DeliveryEligibleSourceItem = {
  skuId: string;
  quantity: number;
};

export type DeliveryEligiblePosSale = {
  invoiceReference: string;
  locationId: string;
  state: "confirmed" | "voided" | "superseded";
  items: DeliveryEligibleSourceItem[];
  customer: {
    name: string | null;
    phone: string | null;
    email: string | null;
  };
};

export type DeliveryEligibleOnlineOrder = {
  orderReference: string;
  locationId: string;
  state: "confirmed" | "cancelled" | "fulfilled";
  items: DeliveryEligibleSourceItem[];
};

export type DeliveryEligibleTransfer = {
  transferReference: string;
  sourceLocationId: string;
  destinationLocationId: string;
  state: "approved" | "draft" | "cancelled" | "dispatched" | "received";
  items: DeliveryEligibleSourceItem[];
};

export interface PosSaleDeliverySourcePort {
  findByInvoiceReference(
    reference: string,
  ): Promise<DeliveryEligiblePosSale | null>;
}

export interface OnlineOrderDeliverySourcePort {
  findByOrderReference(
    reference: string,
  ): Promise<DeliveryEligibleOnlineOrder | null>;
}

export interface TransferDeliverySourcePort {
  findByTransferReference(
    reference: string,
  ): Promise<DeliveryEligibleTransfer | null>;
}
