import { catalogCategories } from "@shop/database";
import { type InferSelectModel, inArray } from "drizzle-orm";
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
  const [beforeContext, afterContext] = await loadCategorySnapshotContexts(tx, [
    before,
    after,
  ]);
  const diff = diffSnapshot(
    snapshotCategory(before, beforeContext),
    snapshotCategory(after, afterContext),
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
  const [snapshotContext] = await loadCategorySnapshotContexts(tx, [row]);

  await writer.record(tx, {
    entityType: "catalog_category",
    entityId: row.id,
    entityRef: row.slug,
    operation: "created",
    changedFields: [],
    before: null,
    after: snapshotCategory(row, snapshotContext),
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
  const [snapshotContext] = await loadCategorySnapshotContexts(tx, [row]);

  await writer.record(tx, {
    entityType: "catalog_category",
    entityId: row.id,
    entityRef: row.slug,
    operation: "deleted",
    changedFields: TRACKED_CATEGORY_FIELDS as unknown as string[],
    before: snapshotCategory(row, snapshotContext),
    after: null,
    actorId: ctx.actorId,
    occurredAt: ctx.now,
  });
}

async function loadCategorySnapshotContexts(
  tx: ApiDatabase,
  rows: CategoryRaw[],
) {
  const parentIds = [
    ...new Set(
      rows
        .map((row) => row.parentCategoryId)
        .filter((value): value is string => value !== null),
    ),
  ];
  const parents =
    parentIds.length === 0
      ? []
      : await tx
          .select({ id: catalogCategories.id, name: catalogCategories.name })
          .from(catalogCategories)
          .where(inArray(catalogCategories.id, parentIds));
  const parentNames = new Map(parents.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    parentCategoryName:
      row.parentCategoryId === null
        ? null
        : (parentNames.get(row.parentCategoryId) ?? null),
  }));
}
