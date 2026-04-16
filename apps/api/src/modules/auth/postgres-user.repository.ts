import {
  authEvents,
  loginAttempts,
  refreshTokens,
  roles,
  userRoles,
  users,
} from "@shop/database";
import { and, desc, eq, gte, isNull, sql, type SQL } from "drizzle-orm";
import type { BasicUserRoleService } from "../access-control/basic-user-role.service.js";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AccessTokenUserRepository } from "./access-token-authentication.service.js";
import type {
  AuthRepository,
  AuthUserRecord,
} from "./authentication.service.js";
import type { CurrentUserRepository } from "./current-user.service.js";
import { isUniqueViolation } from "./postgres-auth-user-row.js";
import type { RegistrationRepository } from "./registration.service.js";
import type { UserAccessLifecycleRepository } from "./user-access-lifecycle.service.js";
import { PortalKey } from "@shop/contracts";

export class PostgresUserRepository
  implements
    AccessTokenUserRepository,
    AuthRepository,
    CurrentUserRepository,
    RegistrationRepository,
    UserAccessLifecycleRepository
{
  constructor(
    private readonly db: ApiDatabase,
    private readonly basicUserRoleService: BasicUserRoleService,
  ) {}

  async clearLockout(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
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
    try {
      const result = await this.db.transaction(async (tx) => {
        const [userRow] = await tx
          .insert(users)
          .values({
            slug: input.slug,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash: input.passwordHash,
            status: "active",
            requiresPasswordChange: false,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .onConflictDoNothing({ target: users.slug })
          .returning();

        if (!userRow) {
          return { status: "slug_conflict" as const };
        }

        await this.basicUserRoleService.ensureAssigned({
          assignedAt: input.now,
          db: tx,
          userId: userRow.id,
        });

        return {
          status: "created" as const,
          user: {
            ...userRow,
            preferredPortal: userRow.preferredPortal as PortalKey | null,
            availablePortals: [] as PortalKey[],
          },
        };
      });

      return result;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: "email_conflict" };
      }
      throw error;
    }
  }

  async deactivateUser(userId: string, now: Date): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({ status: "deactivated", updatedAt: now })
      .where(and(eq(users.id, userId), sql`${users.status} <> 'deactivated'`));

    return (result.rowCount ?? 0) > 0;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.findUser(eq(users.email, email));
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.findUser(eq(users.id, userId));
  }

  private async findUser(where: SQL | undefined): Promise<AuthUserRecord | null> {
    const user = await this.db.query.users.findFirst({
      where,
      with: {
        userRoles: {
          where: (ur, { isNull }) => isNull(ur.revokedAt),
          with: {
            role: true,
          },
        },
      },
    });

    if (!user) return null;

    const availablePortals = user.userRoles
      .map((ur) => ur.role?.slug)
      .filter((slug): slug is string => 
        !!slug && ["admin", "manager", "worker", "supplier", "agent"].includes(slug)
      );

    return {
      ...user,
      preferredPortal: user.preferredPortal as PortalKey | null,
      availablePortals: Array.from(new Set(availablePortals)).sort() as PortalKey[],
    };
  }

  async getRecentFailedAttemptTimes(
    email: string,
    since: Date,
  ): Promise<Date[]> {
    const rows = await this.db
      .select({ occurredAt: loginAttempts.occurredAt })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email),
          eq(loginAttempts.succeeded, false),
          gte(loginAttempts.occurredAt, since),
        ),
      )
      .orderBy(desc(loginAttempts.occurredAt));

    return rows.map((r) => r.occurredAt);
  }

  async markSuccessfulLogin(userId: string, occurredAt: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: occurredAt, updatedAt: occurredAt })
      .where(eq(users.id, userId));
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
    await this.db.insert(authEvents).values({
      userId: event.userId ?? null,
      eventType: event.eventType,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      occurredAt: event.occurredAt,
    });
  }

  async recordLoginAttempt(attempt: {
    email: string;
    ipAddress?: string;
    occurredAt: Date;
    succeeded: boolean;
  }): Promise<void> {
    await this.db.insert(loginAttempts).values({
      email: attempt.email,
      ipAddress: attempt.ipAddress ?? null,
      succeeded: attempt.succeeded,
      occurredAt: attempt.occurredAt,
    });
  }

  async revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({
        revokedAt: input.revokedAt,
        revokedReason: input.revokedReason,
      })
      .where(
        and(eq(refreshTokens.userId, input.userId), isNull(refreshTokens.revokedAt)),
      );
  }

  async updatePreferredPortal(
    userId: string,
    preferredPortal: string | null,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ preferredPortal: preferredPortal as PortalKey | null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setLockout(userId: string, lockedUntil: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ lockedUntil, updatedAt: lockedUntil })
      .where(eq(users.id, userId));
  }
}
