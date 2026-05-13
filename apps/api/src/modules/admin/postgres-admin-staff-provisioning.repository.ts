import {
  locations,
  permissions,
  rolePermissions,
  userPermissionOverrides,
  userRoles,
  users,
} from "@shop/database";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  type PermissionAssignmentRecord,
  resolveEffectivePermissions,
} from "../access-control/permission-resolution.service.js";
import { isUniqueViolation } from "../auth/postgres-auth-user-row.js";
import type { AdminStaffProvisioningRepository } from "./admin-staff-provisioning.service.js";
import { assignRoleRecord } from "./postgres-admin-user-access-write-commands.js";

export class PostgresAdminStaffProvisioningRepository
  implements AdminStaffProvisioningRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async createStaffUser(
    input: Parameters<AdminStaffProvisioningRepository["createStaffUser"]>[0],
  ): ReturnType<AdminStaffProvisioningRepository["createStaffUser"]> {
    try {
      return await this.db.transaction(async (tx) => {
        const policyResult = await validateLocationPolicy(tx, input);

        if (policyResult.status !== "ok") {
          return policyResult;
        }

        const [created] = await tx
          .insert(users)
          .values({
            createdAt: input.now,
            email: input.email,
            emailVerified: false,
            firstName: input.firstName,
            lastName: input.lastName,
            passwordHash: null,
            requiresPasswordChange: true,
            slug: input.slug,
            status: "active",
            updatedAt: input.now,
          })
          .onConflictDoNothing({ target: users.slug })
          .returning({
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            requiresPasswordChange: users.requiresPasswordChange,
            slug: users.slug,
            status: users.status,
          });

        if (!created) {
          return { status: "slug_conflict" as const };
        }

        for (const assignment of input.roleAssignments) {
          await assignRoleRecord(tx, {
            actorId: input.actorId,
            locationSlug: assignment.locationSlug,
            now: input.now,
            reason: input.reason,
            roleSlug: assignment.roleSlug,
            userSlug: created.slug,
          });
        }

        return { status: "created" as const, user: created };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: "email_conflict" };
      }

      throw error;
    }
  }
}

async function validateLocationPolicy(
  tx: ApiDatabase,
  input: Parameters<AdminStaffProvisioningRepository["createStaffUser"]>[0],
): Promise<
  | { status: "ok" }
  | { status: "location_forbidden" }
  | { status: "self_provision" }
> {
  if (!input.locationPolicy) {
    return { status: "ok" };
  }

  const [actor] = await tx
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, input.actorId))
    .limit(1);

  if (actor?.email?.toLowerCase() === input.email.toLowerCase()) {
    return { status: "self_provision" };
  }

  const requestedSlugs = input.roleAssignments
    .map((assignment) => assignment.locationSlug)
    .filter((locationSlug): locationSlug is string => !!locationSlug);

  if (requestedSlugs.length === 0) {
    return { status: "location_forbidden" };
  }

  const requestedLocations = await tx
    .select({ id: locations.id, slug: locations.slug })
    .from(locations)
    .where(
      and(
        inArray(locations.slug, requestedSlugs),
        eq(locations.status, "active"),
      ),
    );

  if (requestedLocations.length !== new Set(requestedSlugs).size) {
    return { status: "location_forbidden" };
  }

  const permissionAssignments = await getActorPermissionAssignments(
    tx,
    input.actorId,
  );

  for (const location of requestedLocations) {
    const permissionsAtLocation = resolveEffectivePermissions(
      permissionAssignments,
      location.id,
    );

    if (
      !permissionsAtLocation.some(
        (permission) => permission.key === input.locationPolicy?.permission,
      )
    ) {
      return { status: "location_forbidden" };
    }
  }

  return { status: "ok" };
}

async function getActorPermissionAssignments(
  tx: ApiDatabase,
  actorId: string,
): Promise<PermissionAssignmentRecord[]> {
  const roleRows = await tx
    .select({
      effect: sql<"allow" | "deny" | null>`NULL`,
      key: permissions.key,
      locationId: userRoles.locationId,
      source: sql<"role" | "override">`'role'`,
    })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(userRoles.userId, actorId), isNull(userRoles.revokedAt)));

  const overrideRows = await tx
    .select({
      effect: userPermissionOverrides.effect,
      key: permissions.key,
      locationId: userPermissionOverrides.locationId,
      source: sql<"role" | "override">`'override'`,
    })
    .from(userPermissionOverrides)
    .innerJoin(
      permissions,
      eq(permissions.id, userPermissionOverrides.permissionId),
    )
    .where(
      and(
        eq(userPermissionOverrides.userId, actorId),
        isNull(userPermissionOverrides.removedAt),
      ),
    );

  return [...overrideRows, ...roleRows];
}
