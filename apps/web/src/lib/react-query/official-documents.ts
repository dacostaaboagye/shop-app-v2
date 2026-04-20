import type {
  LocationDocumentSettingsResponse,
  OfficialDocumentProfileResponse,
  OfficialDocumentSettingsResponse,
  UpdateLocationDocumentSettingsRequest,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const officialDocumentSettingsQueryKey = ["official-documents", "settings"] as const;
export const officialDocumentProfileQueryKey = (locationId?: string) =>
  ["official-documents", "profile", locationId ?? "global"] as const;
export const locationDocumentSettingsQueryKey = (locationId: string) =>
  ["official-documents", "location-settings", locationId] as const;

export async function fetchOfficialDocumentSettings() {
  return fetchJson<OfficialDocumentSettingsResponse>(
    "/api/admin/settings/documents",
    undefined,
    { auth: "required" },
  );
}

export async function fetchOfficialDocumentProfile(locationId?: string) {
  const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
  return fetchJson<OfficialDocumentProfileResponse>(
    `/api/documents/profile${query}`,
    undefined,
    { auth: "required" },
  );
}

export async function updateOfficialDocumentSettings(
  payload: UpdateOfficialDocumentSettingsRequest,
) {
  return fetchJson<OfficialDocumentSettingsResponse>(
    "/api/admin/settings/documents",
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}

export async function fetchLocationDocumentSettings(locationId: string) {
  return fetchJson<LocationDocumentSettingsResponse>(
    `/api/manager/settings/locations/${encodeURIComponent(locationId)}/documents`,
    undefined,
    { auth: "required" },
  );
}

export async function updateLocationDocumentSettings({
  locationId,
  payload,
}: {
  locationId: string;
  payload: UpdateLocationDocumentSettingsRequest;
}) {
  return fetchJson<LocationDocumentSettingsResponse>(
    `/api/manager/settings/locations/${encodeURIComponent(locationId)}/documents`,
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    { auth: "required" },
  );
}
