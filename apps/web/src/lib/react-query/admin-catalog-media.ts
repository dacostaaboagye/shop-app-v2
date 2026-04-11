import type {
  AdminMediaConfirmRequest,
  AdminMediaListResponse,
  AdminMediaPresignRequest,
  AdminMediaPresignResponse,
  AdminMediaRecord,
  AdminMediaSetPrimaryRequest,
  AdminMediaUpdateRequest,
  CatalogMediaEntityType,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export function adminMediaQueryKey(
  entityType: CatalogMediaEntityType,
  entitySlug: string,
) {
  return ["admin", "catalog", "media", entityType, entitySlug] as const;
}

export async function fetchAdminMedia(
  entityType: CatalogMediaEntityType,
  entitySlug: string,
): Promise<AdminMediaListResponse> {
  const params = new URLSearchParams({ entitySlug, entityType });
  return fetchJson<AdminMediaListResponse>(
    `/api/admin/catalog/media?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function presignAdminMedia(
  input: AdminMediaPresignRequest,
): Promise<AdminMediaPresignResponse> {
  return fetchJson<AdminMediaPresignResponse>(
    "/api/admin/catalog/media/presign",
    { body: JSON.stringify(input), headers: json(), method: "POST" },
    { auth: "required" },
  );
}

export async function confirmAdminMedia(
  input: AdminMediaConfirmRequest,
): Promise<AdminMediaRecord> {
  return fetchJson<AdminMediaRecord>(
    "/api/admin/catalog/media/confirm",
    { body: JSON.stringify(input), headers: json(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminMedia(
  id: string,
  patch: AdminMediaUpdateRequest,
): Promise<AdminMediaRecord> {
  return fetchJson<AdminMediaRecord>(
    `/api/admin/catalog/media/${id}`,
    { body: JSON.stringify(patch), headers: json(), method: "PATCH" },
    { auth: "required" },
  );
}

export async function deleteAdminMedia(id: string): Promise<void> {
  return fetchJson<void>(
    `/api/admin/catalog/media/${id}`,
    { method: "DELETE" },
    { auth: "required" },
  );
}

export async function setAdminMediaPrimary(
  id: string,
  input: AdminMediaSetPrimaryRequest,
): Promise<AdminMediaRecord> {
  return fetchJson<AdminMediaRecord>(
    `/api/admin/catalog/media/${id}/set-primary`,
    { body: JSON.stringify(input), headers: json(), method: "POST" },
    { auth: "required" },
  );
}

function json() {
  return { "Content-Type": "application/json" };
}
