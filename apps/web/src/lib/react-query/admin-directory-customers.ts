import type {
  AdminCreateCustomerAddressRequest,
  AdminCreateCustomerContactRequest,
  AdminCreateCustomerRequest,
  AdminCustomerDetail,
  AdminCustomerListQuery,
  AdminCustomerListResponse,
  AdminUpdateCustomerRequest,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";
import { buildSearchParams, jsonHeaders } from "./admin-directory.common";

export async function fetchAdminCustomers(
  query: AdminCustomerListQuery,
): Promise<AdminCustomerListResponse> {
  return fetchJson<AdminCustomerListResponse>(
    `/api/admin/customers?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminCustomer(
  slug: string,
): Promise<AdminCustomerDetail> {
  return fetchJson<AdminCustomerDetail>(
    `/api/admin/customers/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminCustomer(
  input: AdminCreateCustomerRequest,
): Promise<AdminCustomerDetail> {
  return fetchJson<AdminCustomerDetail>(
    "/api/admin/customers",
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminCustomer(
  slug: string,
  input: AdminUpdateCustomerRequest,
): Promise<AdminCustomerDetail> {
  return fetchJson<AdminCustomerDetail>(
    `/api/admin/customers/${encodeURIComponent(slug)}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "PATCH" },
    { auth: "required" },
  );
}

export async function addAdminCustomerContact(
  slug: string,
  input: AdminCreateCustomerContactRequest,
): Promise<AdminCustomerDetail> {
  return fetchJson<AdminCustomerDetail>(
    `/api/admin/customers/${encodeURIComponent(slug)}/contacts`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function addAdminCustomerAddress(
  slug: string,
  input: AdminCreateCustomerAddressRequest,
): Promise<AdminCustomerDetail> {
  return fetchJson<AdminCustomerDetail>(
    `/api/admin/customers/${encodeURIComponent(slug)}/addresses`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}
