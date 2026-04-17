import type {
  AdminCreateLocationResponse,
  AdminLocationStatus,
  AdminLocationType,
} from "@shop/contracts";
import { locations, locationZones } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { AdminLocationWriteRepository } from "./admin-location-write.service.js";

export class PostgresAdminLocationWriteRepository
  implements AdminLocationWriteRepository
{
  constructor(
    private readonly db: ApiDatabase,
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
    const [row] = await this.db
      .update(locations)
      .set({
        name: input.payload.name,
        type: input.payload.type as AdminLocationType,
        status: input.payload.status as AdminLocationStatus,
        isFulfilmentEnabled: input.payload.isFulfilmentEnabled,
        latitude:
          input.payload.latitude !== undefined
            ? input.payload.latitude?.toString()
            : undefined,
        longitude:
          input.payload.longitude !== undefined
            ? input.payload.longitude?.toString()
            : undefined,
        geoAddress: input.payload.address,
        updatedAt: input.now,
      })
      .where(eq(locations.slug, input.slug))
      .returning({
        slug: locations.slug,
        name: locations.name,
        type: locations.type,
        status: locations.status,
        isFulfilmentEnabled: locations.isFulfilmentEnabled,
        createdAt: locations.createdAt,
      });

    if (!row) return null;

    return {
      ...row,
      managerName: null,
      zoneCount: 0,
      staffCount: 0,
      createdAt: row.createdAt.toISOString(),
    };
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

    const [location] = await this.db
      .insert(locations)
      .values({
        slug,
        name: input.payload.name,
        type: input.payload.type as AdminLocationType,
        status: input.payload.status as AdminLocationStatus,
        isFulfilmentEnabled: input.payload.isFulfilmentEnabled,
        latitude: input.payload.latitude?.toString() ?? null,
        longitude: input.payload.longitude?.toString() ?? null,
        geoAddress: input.payload.address ?? null,
        createdBy: input.actorId,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();

    if (!location) {
      throw new Error("Unable to create location.");
    }

    return {
      slug: location.slug,
      name: location.name,
      type: location.type,
      status: location.status,
      isFulfilmentEnabled: location.isFulfilmentEnabled,
      latitude: location.latitude ? parseFloat(location.latitude) : null,
      longitude: location.longitude ? parseFloat(location.longitude) : null,
      address: location.geoAddress,
      managerName: null,
      zoneCount: 0,
      staffCount: 0,
      createdAt: location.createdAt.toISOString(),
    };
  }

  async createLocationZone(input: {
    actorId: string;
    locationSlug: string;
    now: Date;
    payload: { description?: string | null; name: string };
  }) {
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "location_zone",
      value: input.payload.name,
    });

    const zone = await this.db.transaction(async (tx) => {
      const location = await tx.query.locations.findFirst({
        where: (l, { eq }) => eq(l.slug, input.locationSlug),
        columns: { id: true },
      });

      if (!location) throw new Error("Location not found");

      const [newZone] = await tx
        .insert(locationZones)
        .values({
          locationId: location.id,
          slug,
          name: input.payload.name,
          description: input.payload.description ?? null,
          createdAt: input.now,
        })
        .returning();

      return newZone;
    });

    if (!zone) throw new Error("Unable to create zone");

    return {
      slug: zone.slug,
      name: zone.name,
      description: zone.description,
      createdAt: zone.createdAt.toISOString(),
    };
  }

  async updateLocationZone(input: {
    actorId: string;
    locationSlug: string;
    now: Date;
    payload: { description?: string | null; name?: string };
    zoneSlug: string;
  }) {
    const zone = await this.db.transaction(async (tx) => {
      const location = await tx.query.locations.findFirst({
        where: (l, { eq }) => eq(l.slug, input.locationSlug),
        columns: { id: true },
      });

      if (!location) return null;

      const [updatedZone] = await tx
        .update(locationZones)
        .set({
          name: input.payload.name,
          description: input.payload.description,
        })
        .where(
          and(
            eq(locationZones.locationId, location.id),
            eq(locationZones.slug, input.zoneSlug),
          ),
        )
        .returning();

      return updatedZone;
    });

    if (!zone) return null;

    return {
      slug: zone.slug,
      name: zone.name,
      description: zone.description,
      createdAt: zone.createdAt.toISOString(),
    };
  }

  async deleteLocationZone(input: {
    actorId: string;
    locationSlug: string;
    zoneSlug: string;
  }) {
    const deleted = await this.db.transaction(async (tx) => {
      const location = await tx.query.locations.findFirst({
        where: (l, { eq }) => eq(l.slug, input.locationSlug),
        columns: { id: true },
      });

      if (!location) return false;

      const result = await tx
        .delete(locationZones)
        .where(
          and(
            eq(locationZones.locationId, location.id),
            eq(locationZones.slug, input.zoneSlug),
          ),
        );

      return (result.rowCount ?? 0) > 0;
    });

    return deleted;
  }
}
