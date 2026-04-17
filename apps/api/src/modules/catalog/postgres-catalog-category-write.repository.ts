import type {
  AdminCategorySummary,
  AdminCreateCategoryRequest,
  AdminUpdateCategoryRequest,
} from "@shop/contracts";
import { catalogCategories, catalogMediaAssignments } from "@shop/database";
import { and, eq, type InferSelectModel, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { CatalogCategoryWriteRepository } from "./catalog-category-write.service.js";
import type { PostgresCatalogDeleteGuard } from "./postgres-catalog-delete-guard.js";

type CategoryRaw = InferSelectModel<typeof catalogCategories>;
type CategoryWithParent = CategoryRaw & {
  parentCategory: { slug: string } | null;
};

export class PostgresCatalogCategoryWriteRepository
  implements CatalogCategoryWriteRepository
{
  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly deleteGuard: PostgresCatalogDeleteGuard,
  ) {}

  async createCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCategoryRequest;
  }) {
    const parent = await this.resolveParent(
      input.payload.parentCategorySlug ?? null,
    );
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "catalog_category",
      value: input.payload.name,
    });

    const row = await this.db.transaction(async (tx) => {
      const id = crypto.randomUUID();
      const path = parent ? `${parent.path}/${id}` : id;

      const [inserted] = await tx
        .insert(catalogCategories)
        .values({
          id,
          slug,
          name: input.payload.name,
          description: input.payload.description ?? null,
          parentCategoryId: parent?.id ?? null,
          path,
          status: input.payload.status,
          createdBy: input.actorId,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();

      if (!inserted) throw new Error("Unable to create category.");

      return tx.query.catalogCategories.findFirst({
        where: eq(catalogCategories.id, inserted.id),
        with: {
          parentCategory: { columns: { slug: true } },
        },
      });
    });

    if (!row) throw new Error("Unable to create category.");
    return toCategory(row as CategoryWithParent);
  }

  async updateCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateCategoryRequest;
    slug: string;
  }) {
    let oldPath: string | undefined;
    let newPath: string | undefined;

    const updatedRow = await this.db.transaction(async (tx) => {
      const current = await tx.query.catalogCategories.findFirst({
        where: eq(catalogCategories.slug, input.slug),
        columns: { id: true, path: true, parentCategoryId: true },
      });

      if (!current) return null;

      let parentId: string | null = current.parentCategoryId;
      if ("parentCategorySlug" in input.payload) {
        const parent = await this.resolveParent(
          input.payload.parentCategorySlug ?? null,
        );
        parentId = parent?.id ?? null;
        oldPath = current.path;
        newPath = parent ? `${parent.path}/${current.id}` : current.id;

        if (parent?.path.startsWith(`${oldPath}/`)) {
          throw new AppError({
            code: "validation_error",
            detail:
              "Cannot set a category's parent to one of its own descendants.",
            statusCode: 400,
            title: "Circular reference detected",
          });
        }
      }

      await tx
        .update(catalogCategories)
        .set({
          ...(input.payload.name !== undefined && { name: input.payload.name }),
          ...("description" in input.payload && {
            description: input.payload.description ?? null,
          }),
          ...("parentCategorySlug" in input.payload && {
            parentCategoryId: parentId,
            path: newPath,
          }),
          ...(input.payload.status !== undefined && {
            status: input.payload.status,
          }),
          updatedAt: input.now,
        })
        .where(eq(catalogCategories.slug, input.slug));

      if (oldPath && newPath && oldPath !== newPath) {
        // Update paths of all descendants
        await tx.execute(sql`
          UPDATE catalog_categories 
          SET path = ${newPath} || SUBSTRING(path FROM length(${oldPath}) + 1) 
          WHERE path LIKE ${sql`${oldPath}/%`} AND path != ${oldPath}
        `);
      }

      return tx.query.catalogCategories.findFirst({
        where: eq(catalogCategories.id, current.id),
        with: {
          parentCategory: { columns: { slug: true } },
        },
      });
    });

    if (!updatedRow) return null;
    return toCategory(updatedRow as CategoryWithParent);
  }

  async deleteCategory(input: { slug: string }) {
    await this.deleteGuard.assertCategoryCanBeDeleted(input.slug);

    await this.db.transaction(async (tx) => {
      // Clean up media assignments
      await tx
        .delete(catalogMediaAssignments)
        .where(
          and(
            eq(catalogMediaAssignments.entitySlug, input.slug),
            eq(catalogMediaAssignments.entityType, "category"),
          ),
        );

      const result = await tx
        .delete(catalogCategories)
        .where(eq(catalogCategories.slug, input.slug));

      if (result.rowCount === 0) {
        throw new AppError({
          code: "not_found",
          detail: `Category "${input.slug}" does not exist.`,
          statusCode: 404,
          title: "Category not found",
        });
      }
    });
  }

  private async resolveParent(
    parentSlug: string | null | undefined,
  ): Promise<{ id: string; path: string } | null> {
    if (!parentSlug) return null;

    const row = await this.db.query.catalogCategories.findFirst({
      where: eq(catalogCategories.slug, parentSlug),
      columns: { id: true, path: true },
    });

    if (!row) {
      throw new AppError({
        code: "not_found",
        detail: `Parent category "${parentSlug}" does not exist.`,
        statusCode: 404,
        title: "Parent category not found",
      });
    }

    return row;
  }
}

function toCategory(row: CategoryWithParent): AdminCategorySummary {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    parentCategorySlug: row.parentCategory?.slug ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    primaryImageUrl: null,
  };
}
