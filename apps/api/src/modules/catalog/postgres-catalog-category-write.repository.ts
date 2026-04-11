import type {
  AdminCategorySummary,
  AdminCreateCategoryRequest,
  AdminUpdateCategoryRequest,
} from "@shop/contracts";
import type { Pool } from "pg";
import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { CatalogCategoryWriteRepository } from "./catalog-category-write.service.js";

type CategoryRow = Omit<AdminCategorySummary, "createdAt"> & {
  createdAt: Date;
};

export class PostgresCatalogCategoryWriteRepository
  implements CatalogCategoryWriteRepository
{
  constructor(
    private readonly pool: Pick<Pool, "query">,
    private readonly slugAllocator: SlugAllocator,
  ) {}

  async createCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCategoryRequest;
  }) {
    const parentId = await this.resolveParentId(
      input.payload.parentCategorySlug ?? null,
    );
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "catalog_category",
      value: input.payload.name,
    });

    const result = await this.pool.query<CategoryRow>(
      `
        WITH inserted AS (
          INSERT INTO catalog_categories (
            slug, name, description, parent_category_id, status,
            created_by, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
          RETURNING id, slug, name, description, parent_category_id, status, created_at
        )
        SELECT
          i.slug,
          i.name,
          i.description,
          parent.slug AS "parentCategorySlug",
          i.status,
          i.created_at AS "createdAt"
        FROM inserted i
        LEFT JOIN catalog_categories parent ON parent.id = i.parent_category_id
      `,
      [
        slug,
        input.payload.name,
        input.payload.description ?? null,
        parentId,
        input.payload.status,
        input.actorId,
        input.now,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Unable to create category.");
    return toCategory(row);
  }

  async updateCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateCategoryRequest;
    slug: string;
  }) {
    const sets: string[] = ["updated_at = $2"];
    const values: unknown[] = [input.slug, input.now];

    if (input.payload.name !== undefined) {
      values.push(input.payload.name);
      sets.push(`name = $${values.length}`);
    }

    if ("description" in input.payload) {
      values.push(input.payload.description ?? null);
      sets.push(`description = $${values.length}`);
    }

    if ("parentCategorySlug" in input.payload) {
      const parentId = await this.resolveParentId(
        input.payload.parentCategorySlug ?? null,
      );
      values.push(parentId);
      sets.push(`parent_category_id = $${values.length}`);
    }

    if (input.payload.status !== undefined) {
      values.push(input.payload.status);
      sets.push(`status = $${values.length}`);
    }

    const result = await this.pool.query<CategoryRow>(
      `
        WITH updated AS (
          UPDATE catalog_categories
          SET ${sets.join(", ")}
          WHERE slug = $1
          RETURNING id, slug, name, description, parent_category_id, status, created_at
        )
        SELECT
          u.slug,
          u.name,
          u.description,
          parent.slug AS "parentCategorySlug",
          u.status,
          u.created_at AS "createdAt"
        FROM updated u
        LEFT JOIN catalog_categories parent ON parent.id = u.parent_category_id
      `,
      values,
    );

    const row = result.rows[0];
    if (!row) return null;
    return toCategory(row);
  }

  private async resolveParentId(
    parentSlug: string | null | undefined,
  ): Promise<string | null> {
    if (!parentSlug) return null;

    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM catalog_categories WHERE slug = $1`,
      [parentSlug],
    );

    const id = result.rows[0]?.id;
    if (!id) {
      throw new AppError({
        code: "not_found",
        detail: `Parent category "${parentSlug}" does not exist.`,
        statusCode: 404,
        title: "Parent category not found",
      });
    }

    return id;
  }
}

function toCategory(row: CategoryRow): AdminCategorySummary {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
