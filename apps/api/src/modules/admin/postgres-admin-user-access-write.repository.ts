import type { Pool } from "pg";
import { isUniqueViolation } from "../auth/postgres-auth-user-row.js";
import type { AdminUserAccessWriteRepository } from "./admin-user-access-write.service.js";
import {
  duplicateEmailError,
  resolveUser,
  revokeRefreshTokens,
  userNotFoundError,
} from "./postgres-admin-user-access-write.support.js";
import {
  assignRoleRecord,
  removePermissionOverrideRecord,
  revokeRoleRecord,
  runInTransaction,
  setPermissionOverrideRecord,
} from "./postgres-admin-user-access-write-commands.js";

export class PostgresAdminUserAccessWriteRepository
  implements AdminUserAccessWriteRepository
{
  constructor(private readonly pool: Pool) {}

  async assignRole(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    reason: string;
    roleSlug: string;
    userSlug: string;
  }): Promise<void> {
    await runInTransaction(this.pool, (client) =>
      assignRoleRecord(client, input),
    );
  }

  async revokeRole(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    reason: string;
    roleSlug: string;
    userSlug: string;
  }): Promise<void> {
    await runInTransaction(this.pool, (client) =>
      revokeRoleRecord(client, input),
    );
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
    await runInTransaction(this.pool, (client) =>
      setPermissionOverrideRecord(client, input),
    );
  }

  async removePermissionOverride(input: {
    actorId: string;
    locationSlug: string | null;
    now: Date;
    permissionKey: string;
    reason: string;
    userSlug: string;
  }): Promise<void> {
    await runInTransaction(this.pool, (client) =>
      removePermissionOverrideRecord(client, input),
    );
  }

  async updateProfile(input: {
    email: string;
    firstName: string;
    lastName: string;
    userSlug: string;
  }): Promise<void> {
    try {
      const result = await this.pool.query(
        `
          UPDATE users
          SET first_name = $2,
              last_name = $3,
              email = $4,
              updated_at = NOW()
          WHERE slug = $1
        `,
        [
          input.userSlug,
          input.firstName.trim(),
          input.lastName.trim(),
          input.email.trim().toLowerCase(),
        ],
      );

      if ((result.rowCount ?? 0) === 0) {
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
    const user = await resolveUser(this.pool, input.userSlug);
    const result = await this.pool.query(
      `
        UPDATE users
        SET status = $2,
            updated_at = $3
        WHERE id = $1
      `,
      [user.id, input.status, input.now],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw userNotFoundError();
    }

    if (input.status !== "active") {
      await revokeRefreshTokens(this.pool, {
        revokedAt: input.now,
        revokedReason: input.reason,
        userId: user.id,
      });
    }
  }

  async forcePasswordReset(input: {
    actorId: string;
    now: Date;
    reason: string;
    userSlug: string;
  }): Promise<void> {
    const user = await resolveUser(this.pool, input.userSlug);
    const result = await this.pool.query(
      `
        UPDATE users
        SET requires_password_change = true,
            updated_at = $2
        WHERE id = $1
      `,
      [user.id, input.now],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw userNotFoundError();
    }

    await revokeRefreshTokens(this.pool, {
      revokedAt: input.now,
      revokedReason: input.reason,
      userId: user.id,
    });
  }
}
