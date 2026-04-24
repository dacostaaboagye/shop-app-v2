import type {
  AdminAssignUserRoleRequest,
  AdminForceUserPasswordResetRequest,
  AdminRemoveUserPermissionOverrideRequest,
  AdminRevokeUserRoleRequest,
  AdminSetUserPermissionOverrideRequest,
  AdminUpdateUserProfileRequest,
  AdminUpdateUserStatusRequest,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

export type AdminUserAccessWriteRepository = {
  assignRole(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    reason: string;
    roleSlug: string;
    userSlug: string;
  }): Promise<void>;
  forcePasswordReset(input: {
    actorId: string;
    now: Date;
    reason: string;
    userSlug: string;
  }): Promise<void>;
  removePermissionOverride(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    permissionKey: string;
    reason: string;
    userSlug: string;
  }): Promise<void>;
  revokeRole(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    reason: string;
    roleSlug: string;
    userSlug: string;
  }): Promise<void>;
  setPermissionOverride(input: {
    actorId: string;
    effect: "allow" | "deny";
    locationSlug: string | null;
    now: Date;
    permissionKey: string;
    reason: string;
    userSlug: string;
  }): Promise<void>;
  updateProfile(input: {
    email: string;
    firstName: string;
    lastName: string;
    userSlug: string;
  }): Promise<void>;
  updateStatus(input: {
    actorId: string;
    now: Date;
    reason: string;
    status: "active" | "deactivated" | "suspended";
    userSlug: string;
  }): Promise<void>;
};

export class AdminUserAccessWriteService {
  constructor(private readonly repository: AdminUserAccessWriteRepository) {}

  async assignRole(
    actorId: string,
    userSlug: string,
    input: AdminAssignUserRoleRequest,
    now: Date,
  ) {
    if (roleRequiresLocationScope(input.roleSlug) && !input.locationSlug) {
      throw new AppError({
        code: "validation_error",
        detail: `Role "${input.roleSlug}" must be assigned to a location.`,
        statusCode: 400,
        title: "Location scope required",
      });
    }

    return this.repository.assignRole({ ...input, actorId, now, userSlug });
  }

  async revokeRole(
    actorId: string,
    userSlug: string,
    roleSlug: string,
    input: AdminRevokeUserRoleRequest,
    now: Date,
  ) {
    return this.repository.revokeRole({
      ...input,
      actorId,
      now,
      roleSlug,
      userSlug,
    });
  }

  async setPermissionOverride(
    actorId: string,
    userSlug: string,
    input: AdminSetUserPermissionOverrideRequest,
    now: Date,
  ) {
    return this.repository.setPermissionOverride({
      ...input,
      actorId,
      now,
      userSlug,
    });
  }

  async removePermissionOverride(
    actorId: string,
    userSlug: string,
    permissionKey: string,
    input: AdminRemoveUserPermissionOverrideRequest,
    now: Date,
  ) {
    return this.repository.removePermissionOverride({
      ...input,
      actorId,
      now,
      permissionKey,
      userSlug,
    });
  }

  async updateProfile(userSlug: string, input: AdminUpdateUserProfileRequest) {
    return this.repository.updateProfile({ ...input, userSlug });
  }

  async updateStatus(
    actorId: string,
    userSlug: string,
    input: AdminUpdateUserStatusRequest,
    now: Date,
  ) {
    return this.repository.updateStatus({ ...input, actorId, now, userSlug });
  }

  async forcePasswordReset(
    actorId: string,
    userSlug: string,
    input: AdminForceUserPasswordResetRequest,
    now: Date,
  ) {
    return this.repository.forcePasswordReset({
      ...input,
      actorId,
      now,
      userSlug,
    });
  }
}

function roleRequiresLocationScope(roleSlug: string) {
  return roleSlug === "manager" || roleSlug === "worker";
}
