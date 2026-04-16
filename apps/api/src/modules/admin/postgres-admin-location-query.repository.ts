import {
  AdminLocationListQuery,
  AdminLocationStatus,
  AdminLocationType,
  AdminLocationZoneSummary,
} from "@shop/contracts";
import {
  catalogMediaAssignments,
  locationZones,
  locations,
  mediaAssets,
  userRoles,
  users,
} from "@shop/database";
import { and, asc, desc, eq, ilike, or, sql, aliasedTable } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminLocationQueryRepository } from "./admin-location-query.service.js";

export class PostgresAdminLocationQueryRepository
  implements AdminLocationQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getLocation(slug: string) {
    const m = aliasedTable(users, "m");

    const [row] = await this.db
      .select({
        slug: locations.slug,
        name: locations.name,
        type: locations.type,
        status: locations.status,
        isFulfilmentEnabled: locations.isFulfilmentEnabled,
        managerName: sql<string | null>`NULLIF(TRIM(CONCAT_WS(' ', ${m.firstName}, ${m.lastName})), '')`,
        createdAt: locations.createdAt,
        latitude: sql<number>`cast(${locations.latitude} as float)`,
        longitude: sql<number>`cast(${locations.longitude} as float)`,
        address: locations.geoAddress,
        zoneCount: sql<number>`cast(count(distinct ${locationZones.id}) as int)`,
        staffCount: sql<number>`cast(count(distinct ${userRoles.userId}) as int)`,
        primaryImageUrl: mediaAssets.publicUrl,
      })
      .from(locations)
      .leftJoin(m, eq(m.id, locations.managerId))
      .leftJoin(locationZones, eq(locationZones.locationId, locations.id))
      .leftJoin(
        userRoles,
        and(eq(userRoles.locationId, locations.id), sql`${userRoles.revokedAt} IS NULL`),
      )
      .leftJoin(
        catalogMediaAssignments,
        and(
          eq(catalogMediaAssignments.entityType, "location"),
          eq(catalogMediaAssignments.entitySlug, locations.slug),
          eq(catalogMediaAssignments.isPrimary, true),
        ),
      )
      .leftJoin(mediaAssets, eq(mediaAssets.id, catalogMediaAssignments.assetId))
      .where(eq(locations.slug, slug))
      .groupBy(locations.id, m.firstName, m.lastName, mediaAssets.publicUrl);

    if (!row) return null;

    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  async listLocations(input: AdminLocationListQuery) {
    const { page, pageSize, q, type, status, sort, dir } = input;
    const offset = (page - 1) * pageSize;
    const pattern = `%${q.trim()}%`;
    const hasQuery = q.trim().length > 0;
    const m = aliasedTable(users, "m");

    const [totalCountResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(locations)
        .where(
          and(
            hasQuery ? or(ilike(locations.name, pattern), ilike(locations.slug, pattern)) : undefined,
            type !== "all" ? eq(locations.type, type as AdminLocationType) : undefined,
            status !== "all" ? eq(locations.status, status as AdminLocationStatus) : undefined,
          ),
        ),
      this.db
        .select({
          slug: locations.slug,
          name: locations.name,
          type: locations.type,
          status: locations.status,
          isFulfilmentEnabled: locations.isFulfilmentEnabled,
          managerName: sql<string | null>`NULLIF(TRIM(CONCAT_WS(' ', ${m.firstName}, ${m.lastName})), '')`,
          createdAt: locations.createdAt,
          latitude: sql<number>`cast(${locations.latitude} as float)`,
          longitude: sql<number>`cast(${locations.longitude} as float)`,
          address: locations.geoAddress,
          zoneCount: sql<number>`cast(count(distinct ${locationZones.id}) as int)`,
          staffCount: sql<number>`cast(count(distinct ${userRoles.userId}) as int)`,
          primaryImageUrl: mediaAssets.publicUrl,
        })
        .from(locations)
        .leftJoin(m, eq(m.id, locations.managerId))
        .leftJoin(locationZones, eq(locationZones.locationId, locations.id))
        .leftJoin(
          userRoles,
          and(eq(userRoles.locationId, locations.id), sql`${userRoles.revokedAt} IS NULL`),
        )
        .leftJoin(
          catalogMediaAssignments,
          and(
            eq(catalogMediaAssignments.entityType, "location"),
            eq(catalogMediaAssignments.entitySlug, locations.slug),
            eq(catalogMediaAssignments.isPrimary, true),
          ),
        )
        .leftJoin(mediaAssets, eq(mediaAssets.id, catalogMediaAssignments.assetId))
        .where(
          and(
            hasQuery ? or(ilike(locations.name, pattern), ilike(locations.slug, pattern)) : undefined,
            type !== "all" ? eq(locations.type, type as AdminLocationType) : undefined,
            status !== "all" ? eq(locations.status, status as AdminLocationStatus) : undefined,
          ),
        )
        .groupBy(locations.id, m.firstName, m.lastName, mediaAssets.publicUrl)
        .orderBy(
          sort === "createdAt" 
            ? (dir === "desc" ? desc(locations.createdAt) : asc(locations.createdAt)) 
            : (dir === "desc" ? desc(locations.name) : asc(locations.name))
        )
        .limit(pageSize)
        .offset(offset),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      totalCount: totalCountResult[0]?.count ?? 0,
    };
  }

  async listLocationZones(
    locationSlug: string,
  ): Promise<AdminLocationZoneSummary[]> {
    const rows = await this.db
      .select({
        slug: locationZones.slug,
        name: locationZones.name,
        description: locationZones.description,
        createdAt: locationZones.createdAt,
      })
      .from(locationZones)
      .innerJoin(locations, eq(locations.id, locationZones.locationId))
      .where(eq(locations.slug, locationSlug))
      .orderBy(asc(locationZones.name));

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
