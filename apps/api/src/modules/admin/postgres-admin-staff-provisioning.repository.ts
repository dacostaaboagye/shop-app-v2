import { users } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
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
