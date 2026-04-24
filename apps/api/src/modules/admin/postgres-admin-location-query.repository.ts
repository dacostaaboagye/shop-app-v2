import type {
  AdminLocationListQuery,
  AdminLocationStaffSummary,
  AdminLocationStatus,
  AdminLocationType,
  AdminLocationZoneSummary,
} from "@shop/contracts";
import {
  catalogMediaAssignments,
  locations,
  locationZones,
  mediaAssets,
  roles,
  userRoles,
} from "@shop/database";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminLocationQueryRepository } from "./admin-location-query.service.js";
import { listAdminLocationStaff } from "./postgres-admin-location-staff-query.js";

export class PostgresAdminLocationQueryRepository
  implements AdminLocationQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getLocation(slug: string) {
    const [row] = await this.db
      .select({
        slug: locations.slug,
        name: locations.name,
        type: locations.type,
        status: locations.status,
        isFulfilmentEnabled: locations.isFulfilmentEnabled,
        managerName: managerNameSql(),
        createdAt: locations.createdAt,
        latitude: sql<number>`cast(${locations.latitude} as float)`,
        longitude: sql<number>`cast(${locations.longitude} as float)`,
        address: locations.geoAddress,
        zoneCount: sql<number>`cast(count(distinct ${locationZones.id}) as int)`,
        staffCount: staffCountSql(),
        primaryImageUrl: mediaAssets.publicUrl,
      })
      .from(locations)
      .leftJoin(locationZones, eq(locationZones.locationId, locations.id))
      .leftJoin(
        catalogMediaAssignments,
        and(
          eq(catalogMediaAssignments.entityType, "location"),
          eq(catalogMediaAssignments.entitySlug, locations.slug),
          eq(catalogMediaAssignments.isPrimary, true),
        ),
      )
      .leftJoin(
        mediaAssets,
        eq(mediaAssets.id, catalogMediaAssignments.assetId),
      )
      .where(eq(locations.slug, slug))
      .groupBy(locations.id, mediaAssets.publicUrl);

    if (!row) return null;

    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  async listLocations(input: AdminLocationListQuery) {
    const { page, pageSize, q, type, status, sort, dir } = input;
    const offset = (page - 1) * pageSize;
    const pattern = `%${q.trim()}%`;
    const hasQuery = q.trim().length > 0;

    const [totalCountResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(locations)
        .where(
          and(
            hasQuery
              ? or(
                  ilike(locations.name, pattern),
                  ilike(locations.slug, pattern),
                )
              : undefined,
            type !== "all"
              ? eq(locations.type, type as AdminLocationType)
              : undefined,
            status !== "all"
              ? eq(locations.status, status as AdminLocationStatus)
              : undefined,
          ),
        ),
      this.db
        .select({
          slug: locations.slug,
          name: locations.name,
          type: locations.type,
          status: locations.status,
          isFulfilmentEnabled: locations.isFulfilmentEnabled,
          managerName: managerNameSql(),
          createdAt: locations.createdAt,
          latitude: sql<number>`cast(${locations.latitude} as float)`,
          longitude: sql<number>`cast(${locations.longitude} as float)`,
          address: locations.geoAddress,
          zoneCount: sql<number>`cast(count(distinct ${locationZones.id}) as int)`,
          staffCount: staffCountSql(),
          primaryImageUrl: mediaAssets.publicUrl,
        })
        .from(locations)
        .leftJoin(locationZones, eq(locationZones.locationId, locations.id))
        .leftJoin(
          catalogMediaAssignments,
          and(
            eq(catalogMediaAssignments.entityType, "location"),
            eq(catalogMediaAssignments.entitySlug, locations.slug),
            eq(catalogMediaAssignments.isPrimary, true),
          ),
        )
        .leftJoin(
          mediaAssets,
          eq(mediaAssets.id, catalogMediaAssignments.assetId),
        )
        .where(
          and(
            hasQuery
              ? or(
                  ilike(locations.name, pattern),
                  ilike(locations.slug, pattern),
                )
              : undefined,
            type !== "all"
              ? eq(locations.type, type as AdminLocationType)
              : undefined,
            status !== "all"
              ? eq(locations.status, status as AdminLocationStatus)
              : undefined,
          ),
        )
        .groupBy(locations.id, mediaAssets.publicUrl)
        .orderBy(
          sort === "createdAt"
            ? dir === "desc"
              ? desc(locations.createdAt)
              : asc(locations.createdAt)
            : dir === "desc"
              ? desc(locations.name)
              : asc(locations.name),
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

  async listLocationStaff(locationSlug: string): Promise<{
    items: AdminLocationStaffSummary[];
    locationName: string | null;
    locationSlug: string;
  }> {
    return listAdminLocationStaff(this.db, locationSlug);
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

function managerNameSql() {
  return sql<string | null>`(
    select NULLIF(TRIM(CONCAT_WS(' ', staff.first_name, staff.last_name)), '')
    from ${userRoles}
    inner join ${roles} on ${roles.id} = ${userRoles.roleId}
    inner join users as staff on staff.id = ${userRoles.userId}
    where
      ${userRoles.locationId} = ${locations.id}
      and ${userRoles.revokedAt} is null
      and ${roles.slug} = 'manager'
    order by ${userRoles.assignedAt} desc, ${userRoles.id} desc
    limit 1
  )`;
}

function staffCountSql() {
  return sql<number>`(
    select cast(count(distinct ${userRoles.userId}) as int)
    from ${userRoles}
    inner join ${roles} on ${roles.id} = ${userRoles.roleId}
    where
      ${userRoles.locationId} = ${locations.id}
      and ${userRoles.revokedAt} is null
      and ${roles.slug} in ('manager', 'worker')
  )`;
}
