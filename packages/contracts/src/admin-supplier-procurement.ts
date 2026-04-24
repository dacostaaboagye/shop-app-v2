import { z } from "zod";

export const adminSupplierProcurementStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
  "closed",
]);

export const adminSupplierProcurementLineSchema = z.object({
  approvedQuantity: z.number().int().min(1).nullable(),
  productName: z.string().min(1).max(200),
  productSlug: z.string().min(1).max(120),
  receivedQuantity: z.number().int().min(0),
  requestedQuantity: z.number().int().min(1),
  sku: z.string().min(1).max(80),
  unitCost: z.string().nullable(),
  variantName: z.string().min(1).max(160),
  variantSlug: z.string().min(1).max(120),
});

export const adminSupplierProcurementOrderSchema = z.object({
  approvedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  destinationLocationName: z.string().max(160).nullable(),
  destinationLocationSlug: z.string().max(120).nullable(),
  expectedAt: z.iso.datetime().nullable(),
  lines: z.array(adminSupplierProcurementLineSchema).default([]),
  notes: z.string().nullable(),
  orderedAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime().nullable(),
  reference: z.string().min(1).max(25),
  status: adminSupplierProcurementStatusSchema,
});

export const adminCreateSupplierProcurementOrderRequestSchema = z.object({
  destinationLocationSlug: z.string().trim().max(120).nullable().optional(),
  expectedAt: z.iso.datetime().nullable().optional(),
  lines: z
    .array(
      z.object({
        requestedQuantity: z.number().int().min(1),
        unitCost: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/)
          .nullable()
          .optional(),
        variantSlug: z.string().trim().min(1).max(120),
      }),
    )
    .min(1),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const adminSupplierProcurementTransitionRequestSchema = z.object({
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const adminSupplierProcurementReceiveRequestSchema = z.object({
  lines: z
    .array(
      z.object({
        receivedQuantity: z.number().int().min(0),
        variantSlug: z.string().trim().min(1).max(120),
      }),
    )
    .min(1),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type AdminSupplierProcurementStatus = z.infer<
  typeof adminSupplierProcurementStatusSchema
>;
export type AdminCreateSupplierProcurementOrderRequest = z.infer<
  typeof adminCreateSupplierProcurementOrderRequestSchema
>;
export type AdminSupplierProcurementTransitionRequest = z.infer<
  typeof adminSupplierProcurementTransitionRequestSchema
>;
export type AdminSupplierProcurementReceiveRequest = z.infer<
  typeof adminSupplierProcurementReceiveRequestSchema
>;
