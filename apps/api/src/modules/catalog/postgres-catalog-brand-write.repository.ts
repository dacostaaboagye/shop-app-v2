import type {
  AdminBrandSummary,
  AdminCreateBrandRequest,
  AdminUpdateBrandRequest,
} from "@shop/contracts";
import { catalogBrands, catalogMediaAssignments } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import { diffSnapshot } from "../catalog-change-log/catalog-change-diff.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { CatalogBrandWriteRepository } from "./catalog-brand-write.service.js";
import {
  operationFromStatusTransition,
  snapshotBrand,
  TRACKED_BRAND_FIELDS,
} from "./catalog-change-tracking.js";
import type { PostgresCatalogDeleteGuard } from "./postgres-catalog-delete-guard.js";

export class PostgresCatalogBrandWriteRepository
  implements CatalogBrandWriteRepository
{
  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly deleteGuard: PostgresCatalogDeleteGuard,
    private readonly changeLogWriter: CatalogChangeLogWriter,
  ) {}

  async createBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateBrandRequest;
  }) {
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "catalog_brand",
      value: input.payload.name,
    });

    const inserted = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(catalogBrands)
        .values({
          slug,
          name: input.payload.name,
          description: input.payload.description ?? null,
          website: input.payload.website ?? null,
          status: input.payload.status,
          createdBy: input.actorId,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();

      if (!row) throw new Error("Unable to create brand.");

      await this.changeLogWriter.record(tx, {
        entityType: "catalog_brand",
        entityId: row.id,
        entityRef: row.slug,
        operation: "created",
        changedFields: [],
        before: null,
        after: snapshotBrand(row),
        actorId: input.actorId,
        occurredAt: input.now,
      });

      return row;
    });

    return toBrand(inserted);
  }

  async updateBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateBrandRequest;
    slug: string;
  }) {
    const updated = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(catalogBrands)
        .where(eq(catalogBrands.slug, input.slug));

      if (!before) return null;

      const [row] = await tx
        .update(catalogBrands)
        .set({
          ...(input.payload.name !== undefined && { name: input.payload.name }),
          ...("description" in input.payload && {
            description: input.payload.description ?? null,
          }),
          ...("website" in input.payload && {
            website: input.payload.website ?? null,
          }),
          ...(input.payload.status !== undefined && {
            status: input.payload.status,
          }),
          updatedAt: input.now,
        })
        .where(eq(catalogBrands.slug, input.slug))
        .returning();

      if (!row) return null;

      const diff = diffSnapshot(
        snapshotBrand(before),
        snapshotBrand(row),
        TRACKED_BRAND_FIELDS,
      );
      const operation = operationFromStatusTransition(
        before.status,
        row.status,
      );

      // No-op short-circuit for plain updates; status transitions always
      // emit since they represent first-class lifecycle events.
      if (!(operation === "updated" && diff.changedFields.length === 0)) {
        await this.changeLogWriter.record(tx, {
          entityType: "catalog_brand",
          entityId: row.id,
          entityRef: row.slug,
          operation,
          changedFields: diff.changedFields,
          before: diff.before,
          after: diff.after,
          actorId: input.actorId,
          occurredAt: input.now,
        });
      }

      return row;
    });

    return updated ? toBrand(updated) : null;
  }

  async getBrand(slug: string) {
    const row = await this.db.query.catalogBrands.findFirst({
      where: eq(catalogBrands.slug, slug),
    });
    return row ? toBrand(row) : null;
  }

  async deleteBrand(input: { actorId: string; now: Date; slug: string }) {
    await this.deleteGuard.assertBrandCanBeDeleted(input.slug);

    await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(catalogBrands)
        .where(eq(catalogBrands.slug, input.slug));

      if (!before) {
        throw new AppError({
          code: "not_found",
          detail: `Brand "${input.slug}" does not exist.`,
          statusCode: 404,
          title: "Brand not found",
        });
      }

      await tx
        .delete(catalogMediaAssignments)
        .where(
          and(
            eq(catalogMediaAssignments.entitySlug, input.slug),
            eq(catalogMediaAssignments.entityType, "brand"),
          ),
        );

      await this.changeLogWriter.record(tx, {
        entityType: "catalog_brand",
        entityId: before.id,
        entityRef: before.slug,
        operation: "deleted",
        changedFields: TRACKED_BRAND_FIELDS as unknown as string[],
        before: snapshotBrand(before),
        after: null,
        actorId: input.actorId,
        occurredAt: input.now,
      });

      const result = await tx
        .delete(catalogBrands)
        .where(eq(catalogBrands.slug, input.slug));

      if (result.rowCount === 0) {
        throw new AppError({
          code: "not_found",
          detail: `Brand "${input.slug}" does not exist.`,
          statusCode: 404,
          title: "Brand not found",
        });
      }
    });
  }
}

function toBrand(row: typeof catalogBrands.$inferSelect): AdminBrandSummary {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    primaryImageUrl: null,
  };
}
