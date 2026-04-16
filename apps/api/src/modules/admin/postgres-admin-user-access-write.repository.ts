import { users } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { isUniqueViolation } from "../auth/postgres-auth-user-row.js";
import type { AdminUserAccessWriteRepository } from "./admin-user-access-write.service.js";
import {
  assignRoleRecord,
  removePermissionOverrideRecord,
  revokeRoleRecord,
  setPermissionOverrideRecord,
} from "./postgres-admin-user-access-write-commands.js";
import {
  duplicateEmailError,
  resolveUser,
  revokeRefreshTokens,
  userNotFoundError,
} from "./postgres-admin-user-access-write.support.js";

export class PostgresAdminUserAccessWriteRepository
  implements AdminUserAccessWriteRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async assignRole(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    reason: string;
    roleSlug: string;
    userSlug: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await assignRoleRecord(tx, input);
    });
  }

  async revokeRole(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    reason: string;
    roleSlug: string;
    userSlug: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await revokeRoleRecord(tx, input);
    });
  }

  async setPermissionOverride(input: {
    actorId: string;
    effect: "allow" | "deny";
    locationSlug: string | null;
    now: Date;
    permissionKey: string;
    reason: string;
    userSlug: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await setPermissionOverrideRecord(tx, input);
    });
  }

  async removePermissionOverride(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    permissionKey: string;
    reason: string;
    userSlug: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await removePermissionOverrideRecord(tx, input);
    });
  }

  async updateProfile(input: {
    email: string;
    firstName: string;
    lastName: string;
    userSlug: string;
  }): Promise<void> {
    try {
      const [updated] = await this.db
        .update(users)
        .set({
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email.trim().toLowerCase(),
          updatedAt: new Date(),
        })
        .where(eq(users.slug, input.userSlug))
        .returning({ id: users.id });

      if (!updated) {
        throw userNotFoundError();
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateEmailError();
      }

      throw error;
    }
  }

  async updateStatus(input: {
    actorId: string;
    now: Date;
    reason: string;
    status: "active" | "deactivated" | "suspended";
    userSlug: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const user = await resolveUser(tx, input.userSlug);
      const [updated] = await tx
        .update(users)
        .set({
          status: input.status,
          updatedAt: input.now,
        })
        .where(eq(users.id, user.id))
        .returning({ id: users.id });

      if (!updated) {
        throw userNotFoundError();
      }

      if (input.status !== "active") {
        await revokeRefreshTokens(tx, {
          revokedAt: input.now,
          revokedReason: input.reason,
          userId: user.id,
        });
      }
    });
  }

  async forcePasswordReset(input: {
    actorId: string;
    now: Date;
    reason: string;
    userSlug: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const user = await resolveUser(tx, input.userSlug);
      const [updated] = await tx
        .update(users)
        .set({
          requiresPasswordChange: true,
          updatedAt: input.now,
        })
        .where(eq(users.id, user.id))
        .returning({ id: users.id });

      if (!updated) {
        throw userNotFoundError();
      }

      await revokeRefreshTokens(tx, {
        revokedAt: input.now,
        revokedReason: input.reason,
        userId: user.id,
      });
    });
  }
}
