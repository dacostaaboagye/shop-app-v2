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

const schemaByEntityType: Record<SlugEntityType, any> = {
  catalog_brand: catalogBrands,
  catalog_category: catalogCategories,
  catalog_product: catalogProducts,
  location: locations,
  location_zone: locationZones,
  product_variant: productVariants,
  role: roles,
  user: users,
};

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
    const table = schemaByEntityType[input.entityType];
    if (!table) return null;

    const [row] = await this.db
      .select({ entityUuid: table.id })
      .from(table)
      .where(eq(table.slug, input.slug))
      .limit(1);

    return row ?? null;
  }
}
