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
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { roleRequiresLocationScope } from "./admin-role-scope-policy.js";
import {
  createAdminUserOverrideRemovedEvent,
  createAdminUserOverrideSetEvent,
  createAdminUserPasswordResetRequiredEvent,
  createAdminUserProfileUpdatedEvent,
  createAdminUserRoleAssignedEvent,
  createAdminUserRoleRevokedEvent,
  createAdminUserStatusUpdatedEvent,
} from "./admin-user-access-events.js";

type AuthenticatedAccessActor = {
  userId: string;
  userSlug: string;
};

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
  constructor(
    private readonly repository: AdminUserAccessWriteRepository,
    private readonly eventPublisher: PlatformEventPublisher | null = null,
  ) {}

  async assignRole(
    actor: AuthenticatedAccessActor,
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

    await this.repository.assignRole({
      ...input,
      actorId: actor.userId,
      now,
      userSlug,
    });
    await this.eventPublisher?.publish(
      createAdminUserRoleAssignedEvent({
        actor,
        occurredAt: now,
        request: input,
        userSlug,
      }),
    );
  }

  async revokeRole(
    actor: AuthenticatedAccessActor,
    userSlug: string,
    roleSlug: string,
    input: AdminRevokeUserRoleRequest,
    now: Date,
  ) {
    await this.repository.revokeRole({
      ...input,
      actorId: actor.userId,
      now,
      roleSlug,
      userSlug,
    });
    await this.eventPublisher?.publish(
      createAdminUserRoleRevokedEvent({
        actor,
        occurredAt: now,
        request: input,
        roleSlug,
        userSlug,
      }),
    );
  }

  async setPermissionOverride(
    actor: AuthenticatedAccessActor,
    userSlug: string,
    input: AdminSetUserPermissionOverrideRequest,
    now: Date,
  ) {
    await this.repository.setPermissionOverride({
      ...input,
      actorId: actor.userId,
      now,
      userSlug,
    });
    await this.eventPublisher?.publish(
      createAdminUserOverrideSetEvent({
        actor,
        occurredAt: now,
        request: input,
        userSlug,
      }),
    );
  }

  async removePermissionOverride(
    actor: AuthenticatedAccessActor,
    userSlug: string,
    permissionKey: string,
    input: AdminRemoveUserPermissionOverrideRequest,
    now: Date,
  ) {
    await this.repository.removePermissionOverride({
      ...input,
      actorId: actor.userId,
      now,
      permissionKey,
      userSlug,
    });
    await this.eventPublisher?.publish(
      createAdminUserOverrideRemovedEvent({
        actor,
        occurredAt: now,
        permissionKey,
        request: input,
        userSlug,
      }),
    );
  }

  async updateProfile(
    actor: AuthenticatedAccessActor,
    userSlug: string,
    input: AdminUpdateUserProfileRequest,
  ) {
    await this.repository.updateProfile({ ...input, userSlug });
    await this.eventPublisher?.publish(
      createAdminUserProfileUpdatedEvent({
        actor,
        occurredAt: new Date(),
        request: input,
        userSlug,
      }),
    );
  }

  async updateStatus(
    actor: AuthenticatedAccessActor,
    userSlug: string,
    input: AdminUpdateUserStatusRequest,
    now: Date,
  ) {
    await this.repository.updateStatus({
      ...input,
      actorId: actor.userId,
      now,
      userSlug,
    });
    await this.eventPublisher?.publish(
      createAdminUserStatusUpdatedEvent({
        actor,
        occurredAt: now,
        request: input,
        userSlug,
      }),
    );
  }

  async forcePasswordReset(
    actor: AuthenticatedAccessActor,
    userSlug: string,
    input: AdminForceUserPasswordResetRequest,
    now: Date,
  ) {
    await this.repository.forcePasswordReset({
      ...input,
      actorId: actor.userId,
      now,
      userSlug,
    });
    await this.eventPublisher?.publish(
      createAdminUserPasswordResetRequiredEvent({
        actor,
        occurredAt: now,
        request: input,
        userSlug,
      }),
    );
  }
}
