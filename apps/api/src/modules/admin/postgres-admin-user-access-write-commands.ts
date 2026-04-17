import { userPermissionOverrides, userRoles } from "@shop/database";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminUserAccessWriteRepository } from "./admin-user-access-write.service.js";
import {
  insertPermissionAudit,
  permissionOverrideNotFoundError,
  resolveLocation,
  resolvePermission,
  resolveRole,
  resolveUser,
  roleAssignmentNotFoundError,
} from "./postgres-admin-user-access-write.support.js";

type AssignRoleInput = Parameters<
  AdminUserAccessWriteRepository["assignRole"]
>[0];
type RevokeRoleInput = Parameters<
  AdminUserAccessWriteRepository["revokeRole"]
>[0];
type SetPermissionOverrideInput = Parameters<
  AdminUserAccessWriteRepository["setPermissionOverride"]
>[0];
type RemovePermissionOverrideInput = Parameters<
  AdminUserAccessWriteRepository["removePermissionOverride"]
>[0];

export async function assignRoleRecord(
  tx: ApiDatabase,
  input: AssignRoleInput,
) {
  const user = await resolveUser(tx, input.userSlug);
  const role = await resolveRole(tx, input.roleSlug);
  const location = await resolveLocation(tx, input.locationSlug);

  const existing = await tx
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.roleId, role.id),
        location?.id
          ? eq(userRoles.locationId, location.id)
          : isNull(userRoles.locationId),
        isNull(userRoles.revokedAt),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await tx.insert(userRoles).values({
    userId: user.id,
    roleId: role.id,
    locationId: location?.id ?? null,
    assignedBy: input.actorId,
    assignedAt: input.now,
  });

  await insertPermissionAudit(tx, {
    action: "role_assigned",
    actorId: input.actorId,
    createdAt: input.now,
    locationId: location?.id ?? null,
    reason: input.reason,
    roleSlug: role.slug,
    targetUserId: user.id,
  });
}

export async function revokeRoleRecord(
  tx: ApiDatabase,
  input: RevokeRoleInput,
) {
  const user = await resolveUser(tx, input.userSlug);
  const role = await resolveRole(tx, input.roleSlug);
  const location = await resolveLocation(tx, input.locationSlug);

  const [revoked] = await tx
    .update(userRoles)
    .set({
      revokedAt: input.now,
      revokedBy: input.actorId,
      revokedReason: input.reason,
    })
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.roleId, role.id),
        location?.id
          ? eq(userRoles.locationId, location.id)
          : isNull(userRoles.locationId),
        isNull(userRoles.revokedAt),
      ),
    )
    .returning({ id: userRoles.id });

  if (!revoked) {
    throw roleAssignmentNotFoundError();
  }

  await insertPermissionAudit(tx, {
    action: "role_revoked",
    actorId: input.actorId,
    createdAt: input.now,
    locationId: location?.id ?? null,
    reason: input.reason,
    roleSlug: role.slug,
    targetUserId: user.id,
  });
}

export async function setPermissionOverrideRecord(
  tx: ApiDatabase,
  input: SetPermissionOverrideInput,
) {
  const user = await resolveUser(tx, input.userSlug);
  const permission = await resolvePermission(tx, input.permissionKey);
  const location = await resolveLocation(tx, input.locationSlug);

  await tx
    .update(userPermissionOverrides)
    .set({
      removedAt: input.now,
      removedBy: input.actorId,
      removedReason: "Superseded by a newer override.",
    })
    .where(
      and(
        eq(userPermissionOverrides.userId, user.id),
        eq(userPermissionOverrides.permissionId, permission.id),
        location?.id
          ? eq(userPermissionOverrides.locationId, location.id)
          : isNull(userPermissionOverrides.locationId),
        isNull(userPermissionOverrides.removedAt),
      ),
    );

  await tx.insert(userPermissionOverrides).values({
    userId: user.id,
    permissionId: permission.id,
    locationId: location?.id ?? null,
    effect: input.effect,
    reason: input.reason,
    setBy: input.actorId,
    createdAt: input.now,
  });

  await insertPermissionAudit(tx, {
    action: "override_set",
    actorId: input.actorId,
    createdAt: input.now,
    locationId: location?.id ?? null,
    overrideEffect: input.effect,
    permissionKey: permission.key,
    reason: input.reason,
    targetUserId: user.id,
  });
}

export async function removePermissionOverrideRecord(
  tx: ApiDatabase,
  input: RemovePermissionOverrideInput,
) {
  const user = await resolveUser(tx, input.userSlug);
  const permission = await resolvePermission(tx, input.permissionKey);
  const location = await resolveLocation(tx, input.locationSlug);

  const [removed] = await tx
    .update(userPermissionOverrides)
    .set({
      removedAt: input.now,
      removedBy: input.actorId,
      removedReason: input.reason,
    })
    .where(
      and(
        eq(userPermissionOverrides.userId, user.id),
        eq(userPermissionOverrides.permissionId, permission.id),
        location?.id
          ? eq(userPermissionOverrides.locationId, location.id)
          : isNull(userPermissionOverrides.locationId),
        isNull(userPermissionOverrides.removedAt),
      ),
    )
    .returning({ effect: userPermissionOverrides.effect });

  if (!removed) {
    throw permissionOverrideNotFoundError();
  }

  await insertPermissionAudit(tx, {
    action: "override_removed",
    actorId: input.actorId,
    createdAt: input.now,
    locationId: location?.id ?? null,
    overrideEffect: removed.effect,
    permissionKey: permission.key,
    reason: input.reason,
    targetUserId: user.id,
  });
}
