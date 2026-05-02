import type {
  catalogProductOptions,
  catalogProductOptionValues,
} from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import {
  snapshotOption,
  snapshotOptionValue,
  TRACKED_OPTION_FIELDS,
  TRACKED_OPTION_VALUE_FIELDS,
} from "./catalog-change-tracking.js";

type OptionRow = typeof catalogProductOptions.$inferSelect;
type OptionValueRow = typeof catalogProductOptionValues.$inferSelect;
type ActorContext = { actorId: string; now: Date };

export async function recordOptionCreated(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  option: OptionRow,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "catalog_product_option",
    entityId: option.id,
    entityRef: option.id,
    parentEntityType: "catalog_product",
    parentEntityId: productId,
    operation: "created",
    changedFields: [],
    before: null,
    after: snapshotOption(option),
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

export async function recordOptionDeleted(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  option: OptionRow,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "catalog_product_option",
    entityId: option.id,
    entityRef: option.id,
    parentEntityType: "catalog_product",
    parentEntityId: productId,
    operation: "deleted",
    changedFields: TRACKED_OPTION_FIELDS as unknown as string[],
    before: snapshotOption(option),
    after: null,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

export async function recordOptionValueCreated(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  value: OptionValueRow,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "catalog_product_option_value",
    entityId: value.id,
    entityRef: value.id,
    parentEntityType: "catalog_product",
    parentEntityId: productId,
    operation: "created",
    changedFields: [],
    before: null,
    after: snapshotOptionValue(value),
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

export async function recordOptionValueDeleted(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  productId: string,
  value: OptionValueRow,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "catalog_product_option_value",
    entityId: value.id,
    entityRef: value.id,
    parentEntityType: "catalog_product",
    parentEntityId: productId,
    operation: "deleted",
    changedFields: TRACKED_OPTION_VALUE_FIELDS as unknown as string[],
    before: snapshotOptionValue(value),
    after: null,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}
