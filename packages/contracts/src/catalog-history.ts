import { z } from "zod";

export const catalogChangeOperationSchema = z.enum([
  "created",
  "updated",
  "archived",
  "restored",
  "deleted",
]);

export const catalogChangeEntityTypeSchema = z.enum([
  "catalog_brand",
  "catalog_category",
  "catalog_product",
  "product_variant",
  "catalog_product_option",
  "catalog_product_option_value",
]);

const snapshotSchema = z.record(z.string(), z.unknown()).nullable();

export const changeLogEntrySchema = z.object({
  operation: catalogChangeOperationSchema,
  entityType: catalogChangeEntityTypeSchema,
  entityRef: z.string().min(1).max(120),
  parentEntityType: catalogChangeEntityTypeSchema.nullable(),
  parentEntityRef: z.string().min(1).max(120).nullable(),
  actorSlug: z.string().max(120),
  actorName: z.string().min(1).max(241),
  occurredAt: z.iso.datetime(),
  changedFields: z.array(z.string().min(1).max(120)),
  before: snapshotSchema,
  after: snapshotSchema,
});

export const changeLogPageSchema = z.object({
  entries: z.array(changeLogEntrySchema),
  nextCursor: z.string().min(1).nullable(),
});

export const changeLogPageQuerySchema = z.object({
  cursor: z.string().min(1).max(2000).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CatalogChangeOperation = z.infer<
  typeof catalogChangeOperationSchema
>;
export type CatalogChangeEntityType = z.infer<
  typeof catalogChangeEntityTypeSchema
>;
export type ChangeLogEntry = z.infer<typeof changeLogEntrySchema>;
export type ChangeLogPage = z.infer<typeof changeLogPageSchema>;
export type ChangeLogPageQuery = z.infer<typeof changeLogPageQuerySchema>;
