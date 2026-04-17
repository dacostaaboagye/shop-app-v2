import { permissionAuditLog, refreshTokens } from "@shop/database";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export type ResolvedUser = {
  id: string;
  slug: string;
};

export async function resolveUser(tx: ApiDatabase, slug: string) {
  const user = await tx.query.users.findFirst({
    where: (u, { eq }) => eq(u.slug, slug),
  });

  if (!user) {
    throw userNotFoundError();
  }

  return user;
}

export async function resolveRole(tx: ApiDatabase, slug: string) {
  const role = await tx.query.roles.findFirst({
    where: (r, { eq }) => eq(r.slug, slug),
  });

  if (!role) {
    throw new AppError({
      code: "not_found",
      detail: `Role ${slug} not found.`,
      statusCode: 404,
      title: "Role not found",
    });
  }

  return role;
}

export async function resolvePermission(tx: ApiDatabase, key: string) {
  const permission = await tx.query.permissions.findFirst({
    where: (p, { eq }) => eq(p.key, key),
  });

  if (!permission) {
    throw new AppError({
      code: "not_found",
      detail: `Permission ${key} not found.`,
      statusCode: 404,
      title: "Permission not found",
    });
  }

  return permission;
}

export async function resolveLocation(tx: ApiDatabase, slug: string | null) {
  if (!slug) {
    return null;
  }

  const location = await tx.query.locations.findFirst({
    where: (l, { eq }) => eq(l.slug, slug),
  });

  if (!location) {
    throw new AppError({
      code: "not_found",
      detail: `Location ${slug} not found.`,
      statusCode: 404,
      title: "Location not found",
    });
  }

  return location;
}

export async function insertPermissionAudit(
  tx: ApiDatabase,
  input: {
    action:
      | "role_assigned"
      | "role_revoked"
      | "override_set"
      | "override_removed";
    actorId: string;
    createdAt: Date;
    locationId: string | null;
    overrideEffect?: "allow" | "deny" | null;
    permissionKey?: string | null;
    reason: string;
    roleSlug?: string | null;
    targetUserId: string;
  },
) {
  await tx.insert(permissionAuditLog).values({
    actorId: input.actorId,
    targetUserId: input.targetUserId,
    action: input.action,
    permissionKey: input.permissionKey ?? null,
    roleSlug: input.roleSlug ?? null,
    locationId: input.locationId,
    overrideEffect: input.overrideEffect ?? null,
    reason: input.reason,
    createdAt: input.createdAt,
  });
}

export async function revokeRefreshTokens(
  tx: ApiDatabase,
  input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  },
) {
  await tx
    .update(refreshTokens)
    .set({
      revokedAt: input.revokedAt,
      revokedReason: input.revokedReason,
    })
    .where(
      and(
        eq(refreshTokens.userId, input.userId),
        isNull(refreshTokens.revokedAt),
      ),
    );
}

export function userNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "User not found.",
    statusCode: 404,
    title: "User not found",
  });
}

export function duplicateEmailError() {
  return new AppError({
    code: "conflict",
    detail: "A user with this email already exists.",
    statusCode: 409,
    title: "Duplicate email",
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

export function permissionOverrideNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested permission override could not be found.",
    statusCode: 404,
    title: "Override not found",
  });
}
