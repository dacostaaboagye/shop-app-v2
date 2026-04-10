import type { Pool, PoolClient } from "pg";
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

export async function runInTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function assignRoleRecord(
  client: PoolClient,
  input: AssignRoleInput,
) {
  const user = await resolveUser(client, input.userSlug);
  const role = await resolveRole(client, input.roleSlug);
  const location = await resolveLocation(client, input.locationSlug);
  const existing = await client.query<{ id: string }>(
    `
      SELECT id
      FROM user_roles
      WHERE user_id = $1
        AND role_id = $2
        AND ((location_id IS NULL AND $3::uuid IS NULL) OR location_id = $3)
        AND revoked_at IS NULL
      LIMIT 1
    `,
    [user.id, role.id, location?.id ?? null],
  );

  if (existing.rows.length > 0) {
    return;
  }

  await client.query(
    `
      INSERT INTO user_roles (user_id, role_id, location_id, assigned_by, assigned_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [user.id, role.id, location?.id ?? null, input.actorId, input.now],
  );
  await insertPermissionAudit(client, {
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
  client: PoolClient,
  input: RevokeRoleInput,
) {
  const user = await resolveUser(client, input.userSlug);
  const role = await resolveRole(client, input.roleSlug);
  const location = await resolveLocation(client, input.locationSlug);
  const revoked = await client.query<{ id: string }>(
    `
      UPDATE user_roles
      SET revoked_at = $4, revoked_by = $5, revoked_reason = $6
      WHERE user_id = $1
        AND role_id = $2
        AND ((location_id IS NULL AND $3::uuid IS NULL) OR location_id = $3)
        AND revoked_at IS NULL
      RETURNING id
    `,
    [
      user.id,
      role.id,
      location?.id ?? null,
      input.now,
      input.actorId,
      input.reason,
    ],
  );

  if (revoked.rows.length === 0) {
    throw roleAssignmentNotFoundError();
  }

  await insertPermissionAudit(client, {
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
  client: PoolClient,
  input: SetPermissionOverrideInput,
) {
  const user = await resolveUser(client, input.userSlug);
  const permission = await resolvePermission(client, input.permissionKey);
  const location = await resolveLocation(client, input.locationSlug);

  await client.query(
    `
      UPDATE user_permission_overrides
      SET removed_at = $4, removed_by = $5, removed_reason = $6
      WHERE user_id = $1
        AND permission_id = $2
        AND ((location_id IS NULL AND $3::uuid IS NULL) OR location_id = $3)
        AND removed_at IS NULL
    `,
    [
      user.id,
      permission.id,
      location?.id ?? null,
      input.now,
      input.actorId,
      "Superseded by a newer override.",
    ],
  );

  await client.query(
    `
      INSERT INTO user_permission_overrides (
        user_id, permission_id, location_id, effect, reason, set_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      user.id,
      permission.id,
      location?.id ?? null,
      input.effect,
      input.reason,
      input.actorId,
      input.now,
    ],
  );
  await insertPermissionAudit(client, {
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
  client: PoolClient,
  input: RemovePermissionOverrideInput,
) {
  const user = await resolveUser(client, input.userSlug);
  const permission = await resolvePermission(client, input.permissionKey);
  const location = await resolveLocation(client, input.locationSlug);
  const removed = await client.query<{ effect: "allow" | "deny" }>(
    `
      UPDATE user_permission_overrides
      SET removed_at = $4, removed_by = $5, removed_reason = $6
      WHERE user_id = $1
        AND permission_id = $2
        AND ((location_id IS NULL AND $3::uuid IS NULL) OR location_id = $3)
        AND removed_at IS NULL
      RETURNING effect
    `,
    [
      user.id,
      permission.id,
      location?.id ?? null,
      input.now,
      input.actorId,
      input.reason,
    ],
  );

  if (removed.rows.length === 0) {
    throw permissionOverrideNotFoundError();
  }

  await insertPermissionAudit(client, {
    action: "override_removed",
    actorId: input.actorId,
    createdAt: input.now,
    locationId: location?.id ?? null,
    overrideEffect: removed.rows[0]?.effect ?? null,
    permissionKey: permission.key,
    reason: input.reason,
    targetUserId: user.id,
  });
}
