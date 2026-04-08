import type { Pool } from "pg";
import type { BasicUserRoleService } from "../access-control/basic-user-role.service.js";
import type { AccessTokenUserRepository } from "./access-token-authentication.service.js";
import type {
  AuthRepository,
  AuthUserRecord,
} from "./authentication.service.js";
import {
  isUniqueViolation,
  type UserRow,
  userSelectSql,
} from "./postgres-auth-user-row.js";
import type { RegistrationRepository } from "./registration.service.js";
import type { UserAccessLifecycleRepository } from "./user-access-lifecycle.service.js";

export class PostgresUserRepository
  implements
    AccessTokenUserRepository,
    AuthRepository,
    RegistrationRepository,
    UserAccessLifecycleRepository
{
  constructor(
    private readonly pool: Pool,
    private readonly basicUserRoleService: BasicUserRoleService,
  ) {}

  async clearLockout(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET locked_until = NULL, updated_at = NOW() WHERE id = $1`,
      [userId],
    );
  }

  async createUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    now: Date;
    passwordHash: string;
    slug: string;
  }): Promise<
    | { status: "created"; user: AuthUserRecord }
    | { status: "email_conflict" | "slug_conflict" }
  > {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const insertResult = await client.query<UserRow>(
        `
          INSERT INTO users (
            slug, first_name, last_name, email, password_hash, status,
            requires_password_change, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, 'active', false, $6, $6)
          ON CONFLICT (slug) DO NOTHING
          RETURNING
            id,
            slug,
            first_name AS "firstName",
            last_name AS "lastName",
            email,
            password_hash AS "passwordHash",
            status,
            preferred_portal AS "preferredPortal",
            last_login_at AS "lastLoginAt",
            locked_until AS "lockedUntil",
            requires_password_change AS "requiresPasswordChange"
        `,
        [
          input.slug,
          input.firstName,
          input.lastName,
          input.email,
          input.passwordHash,
          input.now,
        ],
      );

      const user = insertResult.rows[0];

      if (!user) {
        await client.query("ROLLBACK");
        return { status: "slug_conflict" };
      }

      await this.basicUserRoleService.ensureAssigned({
        assignedAt: input.now,
        client,
        userId: user.id,
      });
      await client.query("COMMIT");

      return {
        status: "created",
        user,
      };
    } catch (error) {
      await client.query("ROLLBACK");

      if (isUniqueViolation(error)) {
        return { status: "email_conflict" };
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async deactivateUser(userId: string, now: Date): Promise<boolean> {
    const result = await this.pool.query(
      `
        UPDATE users
        SET status = 'deactivated', updated_at = $2
        WHERE id = $1 AND status <> 'deactivated'
      `,
      [userId, now],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.findUser("email = $1", [email]);
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.findUser("id = $1", [userId]);
  }

  async getRecentFailedAttemptTimes(
    email: string,
    since: Date,
  ): Promise<Date[]> {
    const result = await this.pool.query<{ occurredAt: Date }>(
      `
        SELECT occurred_at AS "occurredAt"
        FROM login_attempts
        WHERE email = $1 AND succeeded = false AND occurred_at >= $2
        ORDER BY occurred_at DESC
      `,
      [email, since],
    );

    return result.rows.map((row: { occurredAt: Date }) => row.occurredAt);
  }

  async markSuccessfulLogin(userId: string, occurredAt: Date): Promise<void> {
    await this.pool.query(
      `
        UPDATE users
        SET last_login_at = $2, updated_at = $2
        WHERE id = $1
      `,
      [userId, occurredAt],
    );
  }

  async recordAuthEvent(event: {
    eventType:
      | "failed_attempt"
      | "lockout"
      | "login"
      | "logout"
      | "token_refresh";
    ipAddress?: string;
    occurredAt: Date;
    userAgent?: string;
    userId?: string;
  }): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO auth_events (user_id, event_type, ip_address, user_agent, occurred_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        event.userId ?? null,
        event.eventType,
        event.ipAddress ?? null,
        event.userAgent ?? null,
        event.occurredAt,
      ],
    );
  }

  async recordLoginAttempt(attempt: {
    email: string;
    ipAddress?: string;
    occurredAt: Date;
    succeeded: boolean;
  }): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO login_attempts (email, ip_address, succeeded, occurred_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        attempt.email,
        attempt.ipAddress ?? null,
        attempt.succeeded,
        attempt.occurredAt,
      ],
    );
  }

  async revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void> {
    await this.pool.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = $2, revoked_reason = $3
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [input.userId, input.revokedAt, input.revokedReason],
    );
  }

  async setLockout(userId: string, lockedUntil: Date): Promise<void> {
    await this.pool.query(
      `
        UPDATE users
        SET locked_until = $2, updated_at = $2
        WHERE id = $1
      `,
      [userId, lockedUntil],
    );
  }

  private async findUser(
    predicateSql: string,
    values: unknown[],
  ): Promise<AuthUserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `${userSelectSql} WHERE ${predicateSql} LIMIT 1`,
      values,
    );

    return result.rows[0] ?? null;
  }
}
