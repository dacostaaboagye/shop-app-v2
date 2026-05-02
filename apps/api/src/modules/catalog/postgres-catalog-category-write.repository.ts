import type {
  AdminCategorySummary,
  AdminCreateCategoryRequest,
  AdminUpdateCategoryRequest,
} from "@shop/contracts";
import { catalogCategories, catalogMediaAssignments } from "@shop/database";
import { and, eq, type InferSelectModel, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import {
  recordCategoryCreated,
  recordCategoryDeleted,
  recordCategoryUpdate,
} from "./catalog-category-change-log.js";
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
    private readonly changeLogWriter: CatalogChangeLogWriter,
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

      await recordCategoryCreated(tx, this.changeLogWriter, inserted, input);

      return tx.query.catalogCategories.findFirst({
        where: eq(catalogCategories.id, inserted.id),
        with: { parentCategory: { columns: { slug: true } } },
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
      const [before] = await tx
        .select()
        .from(catalogCategories)
        .where(eq(catalogCategories.slug, input.slug));

      if (!before) return null;

      let parentId: string | null = before.parentCategoryId;
      if ("parentCategorySlug" in input.payload) {
        const parent = await this.resolveParent(
          input.payload.parentCategorySlug ?? null,
        );
        parentId = parent?.id ?? null;
        oldPath = before.path;
        newPath = parent ? `${parent.path}/${before.id}` : before.id;

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

      const [after] = await tx
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
        .where(eq(catalogCategories.slug, input.slug))
        .returning();

      if (!after) return null;

      await recordCategoryUpdate(
        tx,
        this.changeLogWriter,
        before,
        after,
        input,
      );

      if (oldPath && newPath && oldPath !== newPath) {
        await tx.execute(sql`
          UPDATE catalog_categories
          SET path = ${newPath} || SUBSTRING(path FROM length(${oldPath}) + 1)
          WHERE path LIKE ${sql`${oldPath}/%`} AND path != ${oldPath}
        `);
      }

      return tx.query.catalogCategories.findFirst({
        where: eq(catalogCategories.id, before.id),
        with: { parentCategory: { columns: { slug: true } } },
      });
    });

    if (!updatedRow) return null;
    return toCategory(updatedRow as CategoryWithParent);
  }

  async getCategory(slug: string) {
    const row = await this.db.query.catalogCategories.findFirst({
      where: eq(catalogCategories.slug, slug),
      with: { parentCategory: { columns: { slug: true } } },
    });
    return row ? toCategory(row as CategoryWithParent) : null;
  }

  async deleteCategory(input: { actorId: string; now: Date; slug: string }) {
    await this.deleteGuard.assertCategoryCanBeDeleted(input.slug);

    await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(catalogCategories)
        .where(eq(catalogCategories.slug, input.slug));

      if (!before) {
        throw notFound(input.slug);
      }

      await tx
        .delete(catalogMediaAssignments)
        .where(
          and(
            eq(catalogMediaAssignments.entitySlug, input.slug),
            eq(catalogMediaAssignments.entityType, "category"),
          ),
        );

      await recordCategoryDeleted(tx, this.changeLogWriter, before, input);

      const result = await tx
        .delete(catalogCategories)
        .where(eq(catalogCategories.slug, input.slug));

      if (result.rowCount === 0) {
        throw notFound(input.slug);
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

function notFound(slug: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Category "${slug}" does not exist.`,
    statusCode: 404,
    title: "Category not found",
  });
}
