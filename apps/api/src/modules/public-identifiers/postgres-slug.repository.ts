import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  locations,
  locationZones,
  productVariants,
  roles,
  slugRedirects,
  users,
} from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type {
  SlugEntityType,
  SlugLookupResult,
  SlugRedirectRecord,
  SlugRepository,
} from "./slug.service.js";

type SlugTable =
  | typeof catalogBrands
  | typeof catalogCategories
  | typeof catalogProducts
  | typeof locations
  | typeof locationZones
  | typeof productVariants
  | typeof roles
  | typeof users;

export class PostgresSlugRepository implements SlugRepository {
  constructor(private readonly db: ApiDatabase) {}

  async lookupSlug(input: {
    entityType: SlugEntityType;
    slug: string;
  }): Promise<SlugLookupResult> {
    const activeEntity = await this.findActiveEntity(input);

    if (activeEntity) {
      return {
        entityUuid: activeEntity.entityUuid,
        status: "active",
      };
    }

    const [redirect] = await this.db
      .select({
        entityUuid: slugRedirects.entityUuid,
        newSlug: slugRedirects.newSlug,
      })
      .from(slugRedirects)
      .where(
        and(
          eq(slugRedirects.entityType, input.entityType),
          eq(slugRedirects.oldSlug, input.slug),
        ),
      )
      .limit(1);

    if (!redirect) {
      return { status: "missing" };
    }

    return {
      entityUuid: redirect.entityUuid,
      newSlug: redirect.newSlug,
      status: "redirect",
    };
  }

  async recordRedirect(input: SlugRedirectRecord): Promise<void> {
    await this.db.insert(slugRedirects).values({
      entityType: input.entityType,
      entityUuid: input.entityUuid,
      oldSlug: input.oldSlug,
      newSlug: input.newSlug,
    });
  }

  private async findActiveEntity(input: {
    entityType: SlugEntityType;
    slug: string;
  }): Promise<{ entityUuid: string } | null> {
    switch (input.entityType) {
      case "catalog_brand":
        return this.findActiveEntityInTable(catalogBrands, input.slug);
      case "catalog_category":
        return this.findActiveEntityInTable(catalogCategories, input.slug);
      case "catalog_product":
        return this.findActiveEntityInTable(catalogProducts, input.slug);
      case "location":
        return this.findActiveEntityInTable(locations, input.slug);
      case "location_zone":
        return this.findActiveEntityInTable(locationZones, input.slug);
      case "product_variant":
        return this.findActiveEntityInTable(productVariants, input.slug);
      case "role":
        return this.findActiveEntityInTable(roles, input.slug);
      case "user":
        return this.findActiveEntityInTable(users, input.slug);
    }
  }

  private async findActiveEntityInTable(
    table: SlugTable,
    slug: string,
  ): Promise<{ entityUuid: string } | null> {
    const [row] = await this.db
      .select({ entityUuid: table.id })
      .from(table)
      .where(eq(table.slug, slug))
      .limit(1);

    return row ?? null;
  }
}
