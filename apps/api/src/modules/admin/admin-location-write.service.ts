import type {
  AdminCreateLocationRequest,
  AdminCreateLocationResponse,
  AdminCreateLocationZoneRequest,
  AdminCreateLocationZoneResponse,
  AdminUpdateLocationRequest,
  AdminUpdateLocationResponse,
  AdminUpdateLocationZoneRequest,
  AdminUpdateLocationZoneResponse,
} from "@shop/contracts";

export type AdminLocationWriteRepository = {
  createLocation(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateLocationRequest;
  }): Promise<AdminCreateLocationResponse>;
  updateLocation(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateLocationRequest;
    slug: string;
  }): Promise<AdminUpdateLocationResponse | null>;
  createLocationZone(input: {
    actorId: string;
    locationSlug: string;
    now: Date;
    payload: AdminCreateLocationZoneRequest;
  }): Promise<AdminCreateLocationZoneResponse>;
  updateLocationZone(input: {
    actorId: string;
    locationSlug: string;
    zoneSlug: string;
    now: Date;
    payload: AdminUpdateLocationZoneRequest;
  }): Promise<AdminUpdateLocationZoneResponse | null>;
  deleteLocationZone(input: {
    actorId: string;
    locationSlug: string;
    zoneSlug: string;
  }): Promise<boolean>;
};

export class AdminLocationWriteService {
  constructor(private readonly repository: AdminLocationWriteRepository) {}

  async createLocation(
    actorId: string,
    payload: AdminCreateLocationRequest,
    now: Date,
  ) {
    return this.repository.createLocation({ actorId, now, payload });
  }

  async updateLocation(
    actorId: string,
    slug: string,
    payload: AdminUpdateLocationRequest,
    now: Date,
  ) {
    return this.repository.updateLocation({ actorId, now, payload, slug });
  }

  async createLocationZone(
    actorId: string,
    locationSlug: string,
    payload: AdminCreateLocationZoneRequest,
    now: Date,
  ) {
    return this.repository.createLocationZone({
      actorId,
      locationSlug,
      now,
      payload,
    });
  }

  async updateLocationZone(
    actorId: string,
    locationSlug: string,
    zoneSlug: string,
    payload: AdminUpdateLocationZoneRequest,
    now: Date,
  ) {
    return this.repository.updateLocationZone({
      actorId,
      locationSlug,
      now,
      payload,
      zoneSlug,
    });
  }

  async deleteLocationZone(
    actorId: string,
    locationSlug: string,
    zoneSlug: string,
  ) {
    return this.repository.deleteLocationZone({
      actorId,
      locationSlug,
      zoneSlug,
    });
  }
}
