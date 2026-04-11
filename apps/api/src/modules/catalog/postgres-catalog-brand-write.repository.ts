import type {
  AdminBrandSummary,
  AdminCreateBrandRequest,
  AdminUpdateBrandRequest,
} from "@shop/contracts";
import type { Pool } from "pg";
import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { CatalogBrandWriteRepository } from "./catalog-brand-write.service.js";

type BrandRow = Omit<AdminBrandSummary, "createdAt"> & { createdAt: Date };

const DUPLICATE_KEY_CODE = "23505";

export class PostgresCatalogBrandWriteRepository
  implements CatalogBrandWriteRepository
{
  constructor(
    private readonly pool: Pick<Pool, "query">,
    private readonly slugAllocator: SlugAllocator,
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

    try {
      const result = await this.pool.query<BrandRow>(
        `
          INSERT INTO catalog_brands (
            slug, name, description, website, status, created_by, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
          RETURNING
            slug,
            name,
            description,
            website,
            status,
            created_at AS "createdAt"
        `,
        [
          slug,
          input.payload.name,
          input.payload.description ?? null,
          input.payload.website ?? null,
          input.payload.status,
          input.actorId,
          input.now,
        ],
      );

      const row = result.rows[0];
      if (!row) throw new Error("Unable to create brand.");
      return toBrand(row);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === DUPLICATE_KEY_CODE
      ) {
        throw new AppError({
          code: "conflict",
          detail: `A brand named "${input.payload.name}" already exists.`,
          statusCode: 409,
          title: "Brand name already exists",
        });
      }
      throw error;
    }
  }

  async updateBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateBrandRequest;
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

    if ("website" in input.payload) {
      values.push(input.payload.website ?? null);
      sets.push(`website = $${values.length}`);
    }

    if (input.payload.status !== undefined) {
      values.push(input.payload.status);
      sets.push(`status = $${values.length}`);
    }

    try {
      const result = await this.pool.query<BrandRow>(
        `
          UPDATE catalog_brands
          SET ${sets.join(", ")}
          WHERE slug = $1
          RETURNING
            slug,
            name,
            description,
            website,
            status,
            created_at AS "createdAt"
        `,
        values,
      );

      const row = result.rows[0];
      if (!row) return null;
      return toBrand(row);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === DUPLICATE_KEY_CODE
      ) {
        throw new AppError({
          code: "conflict",
          detail: `A brand with that name already exists.`,
          statusCode: 409,
          title: "Brand name already exists",
        });
      }
      throw error;
    }
  }
}

function toBrand(row: BrandRow): AdminBrandSummary {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
