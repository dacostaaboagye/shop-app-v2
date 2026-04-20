import type {
  IssuedDocumentSnapshotResponse,
  LocationDocumentSettingsResponse,
  OfficialDocumentProfileResponse,
  OfficialDocumentSettingsResponse,
  UpdateLocationDocumentSettingsRequest,
  UpdateOfficialDocumentSettingsRequest,
} from "@shop/contracts";
import { fetchFile } from "@/lib/react-query/fetch-file";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const officialDocumentSettingsQueryKey = [
  "official-documents",
  "settings",
] as const;
export const officialDocumentProfileQueryKey = (locationId?: string) =>
  ["official-documents", "profile", locationId ?? "global"] as const;
export const salesDocumentSnapshotQueryKey = (reference: string) =>
  ["official-documents", "sales-snapshot", reference] as const;
export const salesDocumentDownloadFileQueryKey = (reference: string) =>
  ["official-documents", "sales-download-file", reference] as const;
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
  const query = locationId
    ? `?locationId=${encodeURIComponent(locationId)}`
    : "";
  return fetchJson<OfficialDocumentProfileResponse>(
    `/api/documents/profile${query}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchSalesDocumentSnapshot(reference: string) {
  return fetchJson<IssuedDocumentSnapshotResponse>(
    `/api/documents/sales/${encodeURIComponent(reference)}/snapshot`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchSalesDocumentDownloadFile(reference: string) {
  const safeReference = reference.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return fetchFile(
    `/api/documents/sales/${encodeURIComponent(reference)}/download`,
    undefined,
    {
      auth: "required",
      fallbackFilename: `${safeReference || "sales-document"}.pdf`,
    },
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
