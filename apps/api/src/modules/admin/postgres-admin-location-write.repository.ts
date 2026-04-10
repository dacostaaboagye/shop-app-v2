import type { AdminCreateLocationResponse } from "@shop/contracts";
import type { Pool } from "pg";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { AdminLocationWriteRepository } from "./admin-location-write.service.js";
import {
  buildLocationUpdateValues,
  toLocationResponse,
  toZoneResponse,
} from "./postgres-admin-location-write.support.js";

export class PostgresAdminLocationWriteRepository
  implements AdminLocationWriteRepository
{
  constructor(
    private readonly pool: Pick<Pool, "query">,
    private readonly slugAllocator: SlugAllocator,
  ) {}

  async updateLocation(input: {
    actorId: string;
    now: Date;
    payload: {
      address?: string | null;
      isFulfilmentEnabled?: boolean;
      latitude?: number | null;
      longitude?: number | null;
      name?: string;
      status?: "active" | "inactive";
      type?: "store" | "warehouse";
    };
    slug: string;
  }) {
    const { sets, values } = buildLocationUpdateValues({
      ...input.payload,
      now: input.now,
      slug: input.slug,
    });

    const result = await this.pool.query(
      `
        UPDATE locations
        SET ${sets.join(", ")}
        WHERE slug = $1
        RETURNING
          slug,
          name,
          type,
          status,
          is_fulfilment_enabled AS "isFulfilmentEnabled",
          NULL::text AS "managerName",
          created_at AS "createdAt",
          0::int AS "zoneCount",
          0::int AS "staffCount"
      `,
      values,
    );
    return toLocationResponse(result.rows[0]);
  }

  async createLocation(input: {
    actorId: string;
    now: Date;
    payload: {
      address?: string;
      isFulfilmentEnabled: boolean;
      latitude?: number;
      longitude?: number;
      name: string;
      status: "active" | "inactive";
      type: "store" | "warehouse";
    };
  }): Promise<AdminCreateLocationResponse> {
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "location",
      value: input.payload.name,
    });
    const result = await this.pool.query<
      Omit<AdminCreateLocationResponse, "createdAt"> & { createdAt: Date }
    >(
      `
        INSERT INTO locations (
          slug, name, type, status, is_fulfilment_enabled, latitude, longitude, geo_address, manager_id, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $10)
        RETURNING
          slug,
          name,
          type,
          status,
          is_fulfilment_enabled AS "isFulfilmentEnabled",
          NULL::text AS "managerName",
          created_at AS "createdAt",
          latitude::float AS "latitude",
          longitude::float AS "longitude",
          geo_address AS "address",
          0::int AS "zoneCount",
          0::int AS "staffCount"
      `,
      [
        slug,
        input.payload.name,
        input.payload.type,
        input.payload.status,
        input.payload.isFulfilmentEnabled,
        input.payload.latitude ?? null,
        input.payload.longitude ?? null,
        input.payload.address ?? null,
        input.actorId,
        input.now,
      ],
    );
    const location = result.rows[0];

    if (!location) {
      throw new Error("Unable to create location.");
    }

    return { ...location, createdAt: location.createdAt.toISOString() };
  }

  async createLocationZone(input: {
    actorId: string;
    locationSlug: string;
    now: Date;
    payload: { description?: string | null; name: string };
  }) {
    // Look up location id from slug
    const locationResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM locations WHERE slug = $1`,
      [input.locationSlug],
    );
    const locationId = locationResult.rows[0]?.id;
    if (!locationId) throw new Error("Location not found");

    const slug = await this.slugAllocator.allocateSlug({
      entityType: "location_zone",
      value: input.payload.name,
    });

    const result = await this.pool.query<{
      createdAt: Date;
      description: string | null;
      name: string;
      slug: string;
    }>(
      `
        INSERT INTO location_zones (
          location_id, slug, name, description, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING
          slug,
          name,
          description,
          created_at AS "createdAt"
      `,
      [
        locationId,
        slug,
        input.payload.name,
        input.payload.description ?? null,
        input.actorId,
        input.now,
      ],
    );

    const zone = toZoneResponse(result.rows[0]);
    if (!zone) throw new Error("Unable to create zone");

    return zone;
  }

  async updateLocationZone(input: {
    actorId: string;
    locationSlug: string;
    now: Date;
    payload: { description?: string | null; name?: string };
    zoneSlug: string;
  }) {
    // We strictly use both slug and locationSlug for isolation
    const locationResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM locations WHERE slug = $1`,
      [input.locationSlug],
    );
    const locationId = locationResult.rows[0]?.id;
    if (!locationId) return null;

    const sets: string[] = ["updated_at = $3"];
    const values: unknown[] = [locationId, input.zoneSlug, input.now];

    if (input.payload.name !== undefined) {
      values.push(input.payload.name);
      sets.push(`name = $${values.length}`);
    }

    if (input.payload.description !== undefined) {
      values.push(input.payload.description);
      sets.push(`description = $${values.length}`);
    }

    const result = await this.pool.query<{
      createdAt: Date;
      description: string | null;
      name: string;
      slug: string;
    }>(
      `
        UPDATE location_zones
        SET ${sets.join(", ")}
        WHERE location_id = $1 AND slug = $2
        RETURNING
          slug,
          name,
          description,
          created_at AS "createdAt"
      `,
      values,
    );

    return toZoneResponse(result.rows[0]);
  }

  async deleteLocationZone(input: {
    actorId: string;
    locationSlug: string;
    zoneSlug: string;
  }) {
    const result = await this.pool.query(
      `
        DELETE FROM location_zones
        WHERE slug = $1 
        AND location_id = (SELECT id FROM locations WHERE slug = $2)
      `,
      [input.zoneSlug, input.locationSlug],
    );

    return (result.rowCount ?? 0) > 0;
  }
}
