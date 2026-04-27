import type {
  AdminBrandSummary,
  AdminCreateBrandRequest,
  AdminUpdateBrandRequest,
} from "@shop/contracts";
import { catalogBrands, catalogMediaAssignments } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { CatalogBrandWriteRepository } from "./catalog-brand-write.service.js";
import type { PostgresCatalogDeleteGuard } from "./postgres-catalog-delete-guard.js";

export class PostgresCatalogBrandWriteRepository
  implements CatalogBrandWriteRepository
{
  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly deleteGuard: PostgresCatalogDeleteGuard,
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

    const [row] = await this.db
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
    return toBrand(row);
  }

  async updateBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateBrandRequest;
    slug: string;
  }) {
    const [row] = await this.db
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
    return toBrand(row);
  }

  async getBrand(slug: string) {
    const row = await this.db.query.catalogBrands.findFirst({
      where: eq(catalogBrands.slug, slug),
    });

    return row ? toBrand(row) : null;
  }

  async deleteBrand(input: { slug: string }) {
    await this.deleteGuard.assertBrandCanBeDeleted(input.slug);

    await this.db.transaction(async (tx) => {
      // Clean up media - delete assignments.
      await tx
        .delete(catalogMediaAssignments)
        .where(
          and(
            eq(catalogMediaAssignments.entitySlug, input.slug),
            eq(catalogMediaAssignments.entityType, "brand"),
          ),
        );

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
    primaryImageUrl: null, // Joined fields not handled here, consistent with previous summary behavior
  };
}
