import type { CatalogMediaEntityType } from "@shop/contracts";
import { catalogMediaAssignments } from "@shop/database";
import { and, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export async function getPrimaryImageUrl(
  db: ApiDatabase,
  entityType: CatalogMediaEntityType,
  entitySlug: string,
): Promise<string | null> {
  const primaryImageUrls = await listPrimaryImageUrls(db, entityType, [
    entitySlug,
  ]);
  return primaryImageUrls.get(entitySlug) ?? null;
}

export async function listPrimaryImageUrls(
  db: ApiDatabase,
  entityType: CatalogMediaEntityType,
  entitySlugs: readonly string[],
): Promise<Map<string, string>> {
  const slugs = [...new Set(entitySlugs)];

  if (slugs.length === 0) {
    return new Map();
  }

  const rows = await db.query.catalogMediaAssignments.findMany({
    where: and(
      eq(catalogMediaAssignments.entityType, entityType),
      eq(catalogMediaAssignments.isPrimary, true),
      inArray(catalogMediaAssignments.entitySlug, slugs),
    ),
    with: {
      asset: {
        columns: {
          publicUrl: true,
        },
      },
    },
  });

  return new Map(
    rows.flatMap((row) =>
      row.asset?.publicUrl ? [[row.entitySlug, row.asset.publicUrl]] : [],
    ),
  );
}
