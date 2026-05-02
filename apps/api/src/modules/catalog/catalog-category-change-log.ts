import type { catalogCategories } from "@shop/database";
import type { InferSelectModel } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { diffSnapshot } from "../catalog-change-log/catalog-change-diff.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import {
  operationFromStatusTransition,
  snapshotCategory,
  TRACKED_CATEGORY_FIELDS,
} from "./catalog-change-tracking.js";

type CategoryRaw = InferSelectModel<typeof catalogCategories>;
type ActorContext = { actorId: string; now: Date };

export async function recordCategoryUpdate(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  before: CategoryRaw,
  after: CategoryRaw,
  ctx: ActorContext,
): Promise<void> {
  const diff = diffSnapshot(
    snapshotCategory(before),
    snapshotCategory(after),
    TRACKED_CATEGORY_FIELDS,
  );
  const operation = operationFromStatusTransition(before.status, after.status);
  if (operation === "updated" && diff.changedFields.length === 0) return;

  await writer.record(tx, {
    entityType: "catalog_category",
    entityId: after.id,
    entityRef: after.slug,
    operation,
    changedFields: diff.changedFields,
    before: diff.before,
    after: diff.after,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

export async function recordCategoryCreated(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  row: CategoryRaw,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "catalog_category",
    entityId: row.id,
    entityRef: row.slug,
    operation: "created",
    changedFields: [],
    before: null,
    after: snapshotCategory(row),
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

export async function recordCategoryDeleted(
  tx: ApiDatabase,
  writer: CatalogChangeLogWriter,
  row: CategoryRaw,
  ctx: ActorContext,
): Promise<void> {
  await writer.record(tx, {
    entityType: "catalog_category",
    entityId: row.id,
    entityRef: row.slug,
    operation: "deleted",
    changedFields: TRACKED_CATEGORY_FIELDS as unknown as string[],
    before: snapshotCategory(row),
    after: null,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}
