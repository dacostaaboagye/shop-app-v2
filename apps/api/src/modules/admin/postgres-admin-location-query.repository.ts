import type {
  AdminLocationListQuery,
  AdminLocationSummary,
  AdminLocationZoneSummary,
} from "@shop/contracts";
import type { Pool } from "pg";
import type { AdminLocationQueryRepository } from "./admin-location-query.service.js";

type AdminLocationRow = Omit<AdminLocationSummary, "createdAt"> & {
  createdAt: Date;
};

export class PostgresAdminLocationQueryRepository
  implements AdminLocationQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async getLocation(slug: string) {
    const result = await this.pool.query<AdminLocationRow>(
      `
        SELECT
          locations.slug,
          locations.name,
          locations.type,
          locations.status,
          locations.is_fulfilment_enabled AS "isFulfilmentEnabled",
          NULLIF(TRIM(CONCAT_WS(' ', managers.first_name, managers.last_name)), '') AS "managerName",
          locations.created_at AS "createdAt",
          locations.latitude::float AS "latitude",
          locations.longitude::float AS "longitude",
          locations.geo_address AS "address",
          COUNT(DISTINCT location_zones.id)::int AS "zoneCount",
          COUNT(DISTINCT user_roles.user_id)::int AS "staffCount"
        FROM locations
        LEFT JOIN users managers ON managers.id = locations.manager_id
        LEFT JOIN location_zones ON location_zones.location_id = locations.id
        LEFT JOIN user_roles
          ON user_roles.location_id = locations.id
          AND user_roles.revoked_at IS NULL
        WHERE locations.slug = $1
        GROUP BY
          locations.id,
          managers.first_name,
          managers.last_name
      `,
      [slug],
    );

    const row = result.rows[0];

    if (!row) return null;

    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  async listLocations(input: AdminLocationListQuery) {
    const values = buildLocationFilterValues(input);
    const offset = (input.page - 1) * input.pageSize;
    const countResult = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM locations
        WHERE ($1::boolean = false OR CONCAT_WS(' ', name, slug) ILIKE $2)
          AND ($3::boolean = false OR type = $4)
          AND ($5::boolean = false OR status = $6)
      `,
      values,
    );
    const result = await this.pool.query<AdminLocationRow>(
      `
        SELECT
          locations.slug,
          locations.name,
          locations.type,
          locations.status,
          locations.is_fulfilment_enabled AS "isFulfilmentEnabled",
          NULLIF(TRIM(CONCAT_WS(' ', managers.first_name, managers.last_name)), '') AS "managerName",
          locations.created_at AS "createdAt",
          locations.latitude::float AS "latitude",
          locations.longitude::float AS "longitude",
          locations.geo_address AS "address",
          COUNT(DISTINCT location_zones.id)::int AS "zoneCount",
          COUNT(DISTINCT user_roles.user_id)::int AS "staffCount"
        FROM locations
        LEFT JOIN users managers ON managers.id = locations.manager_id
        LEFT JOIN location_zones ON location_zones.location_id = locations.id
        LEFT JOIN user_roles
          ON user_roles.location_id = locations.id
          AND user_roles.revoked_at IS NULL
        WHERE ($1::boolean = false OR CONCAT_WS(' ', locations.name, locations.slug) ILIKE $2)
          AND ($3::boolean = false OR locations.type = $4)
          AND ($5::boolean = false OR locations.status = $6)
        GROUP BY
          locations.id,
          managers.first_name,
          managers.last_name
        ORDER BY ${getLocationSortClause(input)}
        LIMIT $7 OFFSET $8
      `,
      [...values, input.pageSize, offset],
    );

    return {
      items: result.rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      totalCount: Number.parseInt(countResult.rows[0]?.count ?? "0", 10),
    };
  }

  async listLocationZones(
    locationSlug: string,
  ): Promise<AdminLocationZoneSummary[]> {
    const result = await this.pool.query<
      Omit<AdminLocationZoneSummary, "createdAt"> & { createdAt: Date }
    >(
      `
        SELECT
          location_zones.slug,
          location_zones.name,
          location_zones.description,
          location_zones.created_at AS "createdAt"
        FROM location_zones
        JOIN locations ON locations.id = location_zones.location_id
        WHERE locations.slug = $1
        ORDER BY location_zones.name ASC
      `,
      [locationSlug],
    );

    return result.rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}

function buildLocationFilterValues(input: AdminLocationListQuery) {
  const query = input.q.trim();

  return [
    query.length > 0,
    `%${query}%`,
    input.type !== "all",
    input.type === "all" ? null : input.type,
    input.status !== "all",
    input.status === "all" ? null : input.status,
  ];
}

function getLocationSortClause(input: AdminLocationListQuery) {
  const direction = input.dir === "desc" ? "DESC" : "ASC";

  switch (input.sort) {
    case "createdAt":
      return `locations.created_at ${direction}, locations.id ASC`;
    case "status":
      return `locations.status ${direction}, locations.name ASC`;
    case "type":
      return `locations.type ${direction}, locations.name ASC`;
    default:
      return `locations.name ${direction}, locations.id ASC`;
  }
}
