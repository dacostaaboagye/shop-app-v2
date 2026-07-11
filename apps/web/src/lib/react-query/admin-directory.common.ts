import type {
  AdminCustomerListQuery,
  AdminLocationListQuery,
  AdminStaffListQuery,
  AdminSupplierListQuery,
  AdminUserListQuery,
} from "@shop/contracts";

export const adminUsersQueryKey = (query: AdminUserListQuery) =>
  ["admin", "users", query] as const;

export const adminStaffQueryKey = (query: AdminStaffListQuery) =>
  ["admin", "staff", query] as const;

export const adminCustomersQueryKey = (query: AdminCustomerListQuery) =>
  ["admin", "customers", query] as const;

export const adminCustomerQueryKey = (slug: string) =>
  ["admin", "customers", slug] as const;

export const adminSuppliersQueryKey = (query: AdminSupplierListQuery) =>
  ["admin", "suppliers", query] as const;

export const adminSupplierQueryKey = (slug: string) =>
  ["admin", "suppliers", slug] as const;

export const adminLocationsQueryKey = (query: AdminLocationListQuery) =>
  ["admin", "locations", query] as const;

export function buildSearchParams(
  query:
    | AdminCustomerListQuery
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

export function jsonHeaders() {
  return { "Content-Type": "application/json" };
}
