import type {
  AdminCreateLocationZoneRequest,
  AdminCreateLocationZoneResponse,
  AdminLocationZoneListResponse,
  AdminUpdateLocationZoneRequest,
  AdminUpdateLocationZoneResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminLocationZonesQueryKey = (slug: string) =>
  ["admin", "locations", slug, "zones"] as const;

export async function fetchAdminLocationZones(
  locationSlug: string,
): Promise<AdminLocationZoneListResponse> {
  return fetchJson<AdminLocationZoneListResponse>(
    `/api/admin/locations/${encodeURIComponent(locationSlug)}/zones`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminLocationZone(
  locationSlug: string,
  input: AdminCreateLocationZoneRequest,
): Promise<AdminCreateLocationZoneResponse> {
  return fetchJson<AdminCreateLocationZoneResponse>(
    `/api/admin/locations/${encodeURIComponent(locationSlug)}/zones`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function updateAdminLocationZone(
  locationSlug: string,
  zoneSlug: string,
  input: AdminUpdateLocationZoneRequest,
): Promise<AdminUpdateLocationZoneResponse> {
  return fetchJson<AdminUpdateLocationZoneResponse>(
    `/api/admin/locations/${encodeURIComponent(locationSlug)}/zones/${encodeURIComponent(zoneSlug)}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function deleteAdminLocationZone(
  locationSlug: string,
  zoneSlug: string,
): Promise<void> {
  return fetchJson<void>(
    `/api/admin/locations/${encodeURIComponent(locationSlug)}/zones/${encodeURIComponent(zoneSlug)}`,
    {
      method: "DELETE",
    },
    { auth: "required" },
  );
}
