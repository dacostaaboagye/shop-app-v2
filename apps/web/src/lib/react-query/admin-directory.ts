import type {
  AdminLocationListQuery,
  AdminLocationListResponse,
  AdminStaffListQuery,
  AdminStaffListResponse,
  AdminUserListQuery,
  AdminUserListResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";
import { buildSearchParams } from "./admin-directory.common";

export {
  adminLocationsQueryKey,
  adminStaffQueryKey,
  adminSupplierQueryKey,
  adminSuppliersQueryKey,
  adminUsersQueryKey,
} from "./admin-directory.common";
export {
  addAdminSupplierContact,
  createAdminSupplier,
  createAdminSupplierInquiry,
  createAdminSupplierProcurementOrder,
  fetchAdminSupplier,
  fetchAdminSuppliers,
  fetchSupplierPortalProfile,
  inviteAdminSupplierContactPortal,
  linkAdminSupplierContactPortal,
  linkAdminSupplierProduct,
  receiveAdminSupplierProcurementOrder,
  removeAdminSupplierContact,
  transitionAdminSupplierProcurementOrder,
  unlinkAdminSupplierContactPortal,
  unlinkAdminSupplierProduct,
  updateAdminSupplier,
  updateAdminSupplierInquiry,
} from "./admin-directory-suppliers";

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

export async function fetchAdminLocations(
  query: AdminLocationListQuery,
): Promise<AdminLocationListResponse> {
  return fetchJson<AdminLocationListResponse>(
    `/api/admin/locations?${buildSearchParams(query).toString()}`,
    undefined,
    { auth: "required" },
  );
}
