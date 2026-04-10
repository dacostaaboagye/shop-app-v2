import type { Pool } from "pg";
import type {
  SlugEntityType,
  SlugLookupResult,
  SlugRedirectRecord,
  SlugRepository,
} from "./slug.service.js";

const slugTableByEntityType: Record<SlugEntityType, string> = {
  location: "locations",
  location_zone: "location_zones",
  role: "roles",
  user: "users",
};

export class PostgresSlugRepository implements SlugRepository {
  constructor(private readonly pool: Pool) {}

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

    const redirectResult = await this.pool.query<{
      entityUuid: string;
      newSlug: string;
    }>(
      `
        SELECT entity_uuid AS "entityUuid", new_slug AS "newSlug"
        FROM slug_redirects
        WHERE entity_type = $1 AND old_slug = $2
        LIMIT 1
      `,
      [input.entityType, input.slug],
    );
    const redirect = redirectResult.rows[0];

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
    await this.pool.query(
      `
        INSERT INTO slug_redirects (entity_type, entity_uuid, old_slug, new_slug)
        VALUES ($1, $2, $3, $4)
      `,
      [input.entityType, input.entityUuid, input.oldSlug, input.newSlug],
    );
  }

  private async findActiveEntity(input: {
    entityType: SlugEntityType;
    slug: string;
  }): Promise<{ entityUuid: string } | null> {
    const tableName = slugTableByEntityType[input.entityType];
    const result = await this.pool.query<{ entityUuid: string }>(
      `SELECT id AS "entityUuid" FROM ${tableName} WHERE slug = $1 LIMIT 1`,
      [input.slug],
    );

    return result.rows[0] ?? null;
  }
}
