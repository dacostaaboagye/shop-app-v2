import type {
  AdminCreateLocationResponse,
  AdminUpdateLocationResponse,
} from "@shop/contracts";

type LocationRow = Omit<
  AdminCreateLocationResponse | AdminUpdateLocationResponse,
  "createdAt"
> & {
  createdAt: Date;
};

type ZoneRow = {
  createdAt: Date;
  description: string | null;
  name: string;
  slug: string;
};

export function buildLocationUpdateValues(input: {
  address?: string | null;
  isFulfilmentEnabled?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  name?: string;
  now: Date;
  slug: string;
  status?: "active" | "inactive";
  type?: "store" | "warehouse";
}) {
  const sets: string[] = ["updated_at = $2"];
  const values: unknown[] = [input.slug, input.now];

  if (input.name !== undefined) {
    values.push(input.name);
    sets.push(`name = $${values.length}`);
  }

  if (input.type !== undefined) {
    values.push(input.type);
    sets.push(`type = $${values.length}`);
  }

  if (input.status !== undefined) {
    values.push(input.status);
    sets.push(`status = $${values.length}`);
  }

  if (input.isFulfilmentEnabled !== undefined) {
    values.push(input.isFulfilmentEnabled);
    sets.push(`is_fulfilment_enabled = $${values.length}`);
  }

  if (input.latitude !== undefined) {
    values.push(input.latitude);
    sets.push(`latitude = $${values.length}`);
  }

  if (input.longitude !== undefined) {
    values.push(input.longitude);
    sets.push(`longitude = $${values.length}`);
  }

  if (input.address !== undefined) {
    values.push(input.address);
    sets.push(`geo_address = $${values.length}`);
  }

  return { sets, values };
}

export function toLocationResponse(location: LocationRow | undefined | null) {
  return location
    ? { ...location, createdAt: location.createdAt.toISOString() }
    : null;
}

export function toZoneResponse(zone: ZoneRow | undefined | null) {
  return zone ? { ...zone, createdAt: zone.createdAt.toISOString() } : null;
}
