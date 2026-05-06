import { randomUUID } from "node:crypto";
import type {
  AdminAssignUserRoleRequest,
  AdminCreateUserRequest,
  AdminForceUserPasswordResetRequest,
  AdminRemoveUserPermissionOverrideRequest,
  AdminRevokeUserRoleRequest,
  AdminSetUserPermissionOverrideRequest,
  AdminUpdateUserProfileRequest,
  AdminUpdateUserStatusRequest,
} from "@shop/contracts";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

type AccessActor = {
  userSlug: string;
};

export function createAdminUserRoleAssignedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminAssignUserRoleRequest;
  userSlug: string;
}): PlatformEventRecord {
  const scopeSummary = input.request.locationSlug
    ? ` at ${input.request.locationSlug}`
    : "";

  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      locationSlug: input.request.locationSlug,
      reason: input.request.reason,
      roleSlug: input.request.roleSlug,
      userSlug: input.userSlug,
    },
    summary: `Access updated for ${input.userSlug}: assigned ${input.request.roleSlug}${scopeSummary}.`,
    type: "access.user.role_assigned",
    userSlug: input.userSlug,
  });
}

export function createAdminUserCreatedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminCreateUserRequest;
  userSlug: string;
}): PlatformEventRecord {
  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      email: input.request.email,
      reason: input.request.reason,
      roleAssignmentCount: String(input.request.roleAssignments.length),
      userSlug: input.userSlug,
    },
    summary: `User account created for ${input.userSlug}.`,
    type: "access.user.created",
    userSlug: input.userSlug,
  });
}

export function createAdminUserRoleRevokedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminRevokeUserRoleRequest;
  roleSlug: string;
  userSlug: string;
}): PlatformEventRecord {
  const scopeSummary = input.request.locationSlug
    ? ` at ${input.request.locationSlug}`
    : "";

  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      locationSlug: input.request.locationSlug,
      reason: input.request.reason,
      roleSlug: input.roleSlug,
      userSlug: input.userSlug,
    },
    summary: `Access updated for ${input.userSlug}: revoked ${input.roleSlug}${scopeSummary}.`,
    type: "access.user.role_revoked",
    userSlug: input.userSlug,
  });
}

export function createAdminUserOverrideSetEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminSetUserPermissionOverrideRequest;
  userSlug: string;
}): PlatformEventRecord {
  const scopeSummary = input.request.locationSlug
    ? ` at ${input.request.locationSlug}`
    : "";

  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      effect: input.request.effect,
      locationSlug: input.request.locationSlug,
      permissionKey: input.request.permissionKey,
      reason: input.request.reason,
      userSlug: input.userSlug,
    },
    summary: `Access override updated for ${input.userSlug}: ${input.request.effect} ${input.request.permissionKey}${scopeSummary}.`,
    type: "access.user.override_set",
    userSlug: input.userSlug,
  });
}

export function createAdminUserOverrideRemovedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  permissionKey: string;
  request: AdminRemoveUserPermissionOverrideRequest;
  userSlug: string;
}): PlatformEventRecord {
  const scopeSummary = input.request.locationSlug
    ? ` at ${input.request.locationSlug}`
    : "";

  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      locationSlug: input.request.locationSlug,
      permissionKey: input.permissionKey,
      reason: input.request.reason,
      userSlug: input.userSlug,
    },
    summary: `Access override removed for ${input.userSlug}: ${input.permissionKey}${scopeSummary}.`,
    type: "access.user.override_removed",
    userSlug: input.userSlug,
  });
}

export function createAdminUserProfileUpdatedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminUpdateUserProfileRequest;
  userSlug: string;
}): PlatformEventRecord {
  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      email: input.request.email,
      firstName: input.request.firstName,
      lastName: input.request.lastName,
      userSlug: input.userSlug,
    },
    summary: `User profile updated for ${input.userSlug}.`,
    type: "access.user.profile_updated",
    userSlug: input.userSlug,
  });
}

export function createAdminUserStatusUpdatedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminUpdateUserStatusRequest;
  userSlug: string;
}): PlatformEventRecord {
  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      reason: input.request.reason,
      status: input.request.status,
      userSlug: input.userSlug,
    },
    summary: `User status updated for ${input.userSlug}: ${input.request.status}.`,
    type: "access.user.status_updated",
    userSlug: input.userSlug,
  });
}

export function createAdminUserPasswordResetRequiredEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminForceUserPasswordResetRequest;
  userSlug: string;
}): PlatformEventRecord {
  return createAccessEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      reason: input.request.reason,
      requiresPasswordChange: true,
      userSlug: input.userSlug,
    },
    summary: `Password reset required for ${input.userSlug}.`,
    type: "access.user.password_reset_required",
    userSlug: input.userSlug,
  });
}

function createAccessEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  payload: Record<string, string | boolean | null>;
  summary: string;
  type: string;
  userSlug: string;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [{ kind: "permission", permission: "access.audit.view" }],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: input.payload,
    resource: {
      kind: "user_access",
      reference: input.userSlug,
    },
    summary: input.summary,
    type: input.type,
  };
}
