import type {
  AdminCreateSupplierContactRequest,
  AdminCreateSupplierInquiryRequest,
  AdminCreateSupplierProcurementOrderRequest,
  AdminCreateSupplierRequest,
  AdminLinkSupplierProductRequest,
  AdminLocationListQuery,
  AdminLocationListResponse,
  AdminStaffListQuery,
  AdminStaffListResponse,
  AdminSupplierDetail,
  AdminSupplierListQuery,
  AdminSupplierListResponse,
  AdminSupplierProcurementReceiveRequest,
  AdminSupplierProcurementTransitionRequest,
  AdminUpdateSupplierInquiryRequest,
  AdminUpdateSupplierRequest,
  AdminUserListQuery,
  AdminUserListResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminUsersQueryKey = (query: AdminUserListQuery) =>
  ["admin", "users", query] as const;

export const adminStaffQueryKey = (query: AdminStaffListQuery) =>
  ["admin", "staff", query] as const;

export const adminSuppliersQueryKey = (query: AdminSupplierListQuery) =>
  ["admin", "suppliers", query] as const;

export const adminSupplierQueryKey = (slug: string) =>
  ["admin", "suppliers", slug] as const;

export const adminLocationsQueryKey = (query: AdminLocationListQuery) =>
  ["admin", "locations", query] as const;

export async function fetchAdminUsers(
  query: AdminUserListQuery,
): Promise<AdminUserListResponse> {
  return fetchJson<AdminUserListResponse>(
    `/api/admin/users?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminStaff(
  query: AdminStaffListQuery,
): Promise<AdminStaffListResponse> {
  return fetchJson<AdminStaffListResponse>(
    `/api/admin/staff?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminSuppliers(
  query: AdminSupplierListQuery,
): Promise<AdminSupplierListResponse> {
  return fetchJson<AdminSupplierListResponse>(
    `/api/admin/suppliers?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminSupplier(
  slug: string,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminSupplier(
  input: AdminCreateSupplierRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    "/api/admin/suppliers",
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminSupplier(
  slug: string,
  input: AdminUpdateSupplierRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "PATCH" },
    { auth: "required" },
  );
}

export async function addAdminSupplierContact(
  slug: string,
  input: AdminCreateSupplierContactRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/contacts`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function removeAdminSupplierContact(
  slug: string,
  contactReference: string,
): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/contacts/${encodeURIComponent(contactReference)}`,
    { method: "DELETE" },
    { auth: "required" },
  );
}

export async function linkAdminSupplierProduct(
  slug: string,
  input: AdminLinkSupplierProductRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/products`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function unlinkAdminSupplierProduct(
  slug: string,
  productSlug: string,
): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/products/${encodeURIComponent(productSlug)}`,
    { method: "DELETE" },
    { auth: "required" },
  );
}

export async function createAdminSupplierInquiry(
  slug: string,
  input: AdminCreateSupplierInquiryRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/inquiries`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminSupplierInquiry(
  slug: string,
  reference: string,
  input: AdminUpdateSupplierInquiryRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/inquiries/${encodeURIComponent(reference)}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "PATCH" },
    { auth: "required" },
  );
}

export async function createAdminSupplierProcurementOrder(
  slug: string,
  input: AdminCreateSupplierProcurementOrderRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/procurement-orders`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function transitionAdminSupplierProcurementOrder(
  slug: string,
  reference: string,
  action: "approve" | "cancel" | "close" | "order" | "submit",
  input: AdminSupplierProcurementTransitionRequest = {},
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/procurement-orders/${encodeURIComponent(reference)}/${action}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function receiveAdminSupplierProcurementOrder(
  slug: string,
  reference: string,
  input: AdminSupplierProcurementReceiveRequest,
): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>(
    `/api/admin/suppliers/${encodeURIComponent(slug)}/procurement-orders/${encodeURIComponent(reference)}/receive`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function fetchAdminLocations(
  query: AdminLocationListQuery,
): Promise<AdminLocationListResponse> {
  return fetchJson<AdminLocationListResponse>(
    `/api/admin/locations?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchSupplierPortalProfile(): Promise<AdminSupplierDetail> {
  return fetchJson<AdminSupplierDetail>("/api/supplier/profile", undefined, {
    auth: "required",
  });
}

function buildSearchParams(
  query:
    | AdminLocationListQuery
    | AdminStaffListQuery
    | AdminSupplierListQuery
    | AdminUserListQuery,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    searchParams.set(key, String(value));
  }

  return searchParams;
}

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}
