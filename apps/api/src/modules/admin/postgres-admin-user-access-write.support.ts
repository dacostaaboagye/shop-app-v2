import type { Pool, PoolClient } from "pg";
import { AppError } from "../_core/errors/app-error.js";

export type ResolvedUser = {
  id: string;
  slug: string;
};

type ResolvedRole = {
  id: string;
  slug: string;
};

type ResolvedPermission = {
  id: string;
  key: string;
};

type ResolvedLocation = {
  id: string;
  slug: string;
};

export async function resolveUser(
  database: Pick<Pool, "query"> | Pick<PoolClient, "query">,
  userSlug: string,
) {
  const result = await database.query<ResolvedUser>(
    `
      SELECT id, slug
      FROM users
      WHERE slug = $1
      LIMIT 1
    `,
    [userSlug],
  );
  const user = result.rows[0];

  if (!user) {
    throw userNotFoundError();
  }

  return user;
}

export async function resolveRole(
  database: Pick<PoolClient, "query">,
  roleSlug: string,
) {
  const result = await database.query<ResolvedRole>(
    `
      SELECT id, slug
      FROM roles
      WHERE slug = $1
      LIMIT 1
    `,
    [roleSlug],
  );
  const role = result.rows[0];

  if (!role) {
    throw roleNotFoundError();
  }

  return role;
}

export async function resolvePermission(
  database: Pick<PoolClient, "query">,
  permissionKey: string,
) {
  const result = await database.query<ResolvedPermission>(
    `
      SELECT id, key
      FROM permissions
      WHERE key = $1
      LIMIT 1
    `,
    [permissionKey],
  );
  const permission = result.rows[0];

  if (!permission) {
    throw permissionNotFoundError();
  }

  return permission;
}

export async function resolveLocation(
  database: Pick<PoolClient, "query">,
  locationSlug: string | null,
) {
  if (!locationSlug) {
    return null;
  }

  const result = await database.query<ResolvedLocation>(
    `
      SELECT id, slug
      FROM locations
      WHERE slug = $1
      LIMIT 1
    `,
    [locationSlug],
  );
  const location = result.rows[0];

  if (!location) {
    throw locationNotFoundError();
  }

  return location;
}

export async function insertPermissionAudit(
  client: Pick<PoolClient, "query">,
  input: {
    action:
      | "override_removed"
      | "override_set"
      | "role_assigned"
      | "role_revoked";
    actorId: string;
    createdAt: Date;
    locationId?: string | null;
    overrideEffect?: "allow" | "deny" | null;
    permissionKey?: string | null;
    reason: string;
    roleSlug?: string | null;
    targetUserId: string;
  },
) {
  await client.query(
    `
      INSERT INTO permission_audit_log (
        actor_id,
        target_user_id,
        action,
        location_id,
        permission_key,
        role_slug,
        override_effect,
        reason,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      input.actorId,
      input.targetUserId,
      input.action,
      input.locationId ?? null,
      input.permissionKey ?? null,
      input.roleSlug ?? null,
      input.overrideEffect ?? null,
      input.reason,
      input.createdAt,
    ],
  );
}

export async function revokeRefreshTokens(
  database: Pick<Pool, "query"> | Pick<PoolClient, "query">,
  input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  },
) {
  await database.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = $2,
          revoked_reason = $3
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [input.userId, input.revokedAt, input.revokedReason],
  );
}

export function duplicateEmailError() {
  return new AppError({
    code: "conflict",
    detail: "An account with that email already exists.",
    statusCode: 409,
    title: "Email already registered",
  });
}

export function locationNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested location could not be found.",
    statusCode: 404,
    title: "Location not found",
  });
}

export function permissionNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested permission could not be found.",
    statusCode: 404,
    title: "Permission not found",
  });
}

export function permissionOverrideNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested permission override could not be found.",
    statusCode: 404,
    title: "Permission override not found",
  });
}

export function roleAssignmentNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested role assignment could not be found.",
    statusCode: 404,
    title: "Role assignment not found",
  });
}

export function roleNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested role could not be found.",
    statusCode: 404,
    title: "Role not found",
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
