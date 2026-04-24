import {
  adminAssignUserRoleRequestSchema,
  adminForceUserPasswordResetRequestSchema,
  adminRemoveUserPermissionOverrideRequestSchema,
  adminRevokeUserRoleRequestSchema,
  adminSetUserPermissionOverrideRequestSchema,
  adminUpdateUserProfileRequestSchema,
  adminUpdateUserStatusRequestSchema,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AdminUserAccessQueryService } from "./admin-user-access-query.service.js";
import type { AdminUserAccessWriteService } from "./admin-user-access-write.service.js";

export type AdminUserAccessRouteDependencies = {
  adminUserAccessQueryService: Pick<
    AdminUserAccessQueryService,
    "getUserAccessDetail"
  >;
  adminUserAccessWriteService: Pick<
    AdminUserAccessWriteService,
    | "assignRole"
    | "forcePasswordReset"
    | "removePermissionOverride"
    | "revokeRole"
    | "setPermissionOverride"
    | "updateProfile"
    | "updateStatus"
  >;
};

export const adminUserAccessSchemas = {
  assignRole: adminAssignUserRoleRequestSchema,
  forcePasswordReset: adminForceUserPasswordResetRequestSchema,
  removeOverride: adminRemoveUserPermissionOverrideRequestSchema,
  revokeRole: adminRevokeUserRoleRequestSchema,
  setOverride: adminSetUserPermissionOverrideRequestSchema,
  updateProfile: adminUpdateUserProfileRequestSchema,
  updateStatus: adminUpdateUserStatusRequestSchema,
} as const;

export const adminUserAccessRoutes = {
  assignRole: {
    access: { kind: "permission", permission: "access.assignments.manage" },
    method: "POST",
    url: "/api/admin/access/users/:slug/roles",
  } satisfies RouteDefinition,
  detail: {
    access: { kind: "permission", permission: "users.view" },
    method: "GET",
    url: "/api/admin/access/users/:slug",
  } satisfies RouteDefinition,
  forcePasswordReset: {
    access: { kind: "permission", permission: "access.assignments.manage" },
    method: "POST",
    url: "/api/admin/access/users/:slug/force-password-reset",
  } satisfies RouteDefinition,
  removeOverride: {
    access: { kind: "permission", permission: "access.assignments.manage" },
    method: "DELETE",
    url: "/api/admin/access/users/:slug/permissions/override/:permissionKey",
  } satisfies RouteDefinition,
  revokeRole: {
    access: { kind: "permission", permission: "access.assignments.manage" },
    method: "DELETE",
    url: "/api/admin/access/users/:slug/roles/:roleSlug",
  } satisfies RouteDefinition,
  setOverride: {
    access: { kind: "permission", permission: "access.assignments.manage" },
    method: "POST",
    url: "/api/admin/access/users/:slug/permissions/override",
  } satisfies RouteDefinition,
  updateProfile: {
    access: { kind: "permission", permission: "access.assignments.manage" },
    method: "PATCH",
    url: "/api/admin/access/users/:slug/profile",
  } satisfies RouteDefinition,
  updateStatus: {
    access: { kind: "permission", permission: "access.assignments.manage" },
    method: "PATCH",
    url: "/api/admin/access/users/:slug/status",
  } satisfies RouteDefinition,
};

export function createUnavailableDependencies(): AdminUserAccessRouteDependencies {
  return {
    adminUserAccessQueryService: {
      async getUserAccessDetail() {
        throw unavailableAdminUserAccessError();
      },
    },
    adminUserAccessWriteService: {
      async assignRole() {
        throw unavailableAdminUserAccessError();
      },
      async forcePasswordReset() {
        throw unavailableAdminUserAccessError();
      },
      async removePermissionOverride() {
        throw unavailableAdminUserAccessError();
      },
      async revokeRole() {
        throw unavailableAdminUserAccessError();
      },
      async setPermissionOverride() {
        throw unavailableAdminUserAccessError();
      },
      async updateProfile() {
        throw unavailableAdminUserAccessError();
      },
      async updateStatus() {
        throw unavailableAdminUserAccessError();
      },
    },
  };
}

export function unavailableAdminUserAccessError() {
  return new AppError({
    code: "internal_error",
    detail:
      "Admin user access services are not configured for this environment.",
    statusCode: 503,
    title: "Admin user access unavailable",
  });
}

export function userNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested user could not be found.",
    statusCode: 404,
    title: "User not found",
  });
}
