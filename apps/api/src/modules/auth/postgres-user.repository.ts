import type { PortalKey } from "@shop/contracts";
import { loginAttempts, users } from "@shop/database";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { BasicUserRoleService } from "../access-control/basic-user-role.service.js";
import type { AccessTokenUserRepository } from "./access-token-authentication.service.js";
import type {
  AuthRepository,
  AuthUserRecord,
} from "./authentication.service.js";
import type { CurrentUserRepository } from "./current-user.service.js";
import type { EmailVerificationUserRepository } from "./email-verification.service.js";
import type { GoogleOAuthRepository } from "./google-oauth.service.js";
import type { PasswordResetUserRepository } from "./password-reset.service.js";
import { findAuthUser } from "./postgres-auth-user-record.js";
import { isUniqueViolation } from "./postgres-auth-user-row.js";
import {
  createOAuthUser,
  findUserByOAuthIdentity,
  linkOAuthIdentity,
} from "./postgres-oauth-identity.js";
import {
  clearUserLockout,
  markUserSuccessfulLogin,
  setUserLockout,
  updateUserPreferredPortal,
} from "./postgres-user-account-state.js";
import {
  recordUserAuthEvent,
  recordUserLoginAttempt,
  revokeUserRefreshTokens,
} from "./postgres-user-auth-events.js";
import {
  findEmailVerificationUser,
  findPasswordResetUser,
  setUserEmailVerified,
} from "./postgres-user-recovery.js";
import type { RegistrationRepository } from "./registration.service.js";
import type { UserAccessLifecycleRepository } from "./user-access-lifecycle.service.js";

export class PostgresUserRepository
  implements
    AccessTokenUserRepository,
    AuthRepository,
    CurrentUserRepository,
    EmailVerificationUserRepository,
    GoogleOAuthRepository,
    PasswordResetUserRepository,
    RegistrationRepository,
    UserAccessLifecycleRepository
{
  constructor(
    private readonly db: ApiDatabase,
    private readonly basicUserRoleService: BasicUserRoleService,
  ) {}
  async clearLockout(userId: string): Promise<void> {
    await clearUserLockout(this.db, userId);
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
    return findAuthUser(this.db, eq(users.email, email));
  }
  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return findAuthUser(this.db, eq(users.id, userId));
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
    await markUserSuccessfulLogin(this.db, userId, occurredAt);
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
    await recordUserAuthEvent(this.db, event);
  }

  async recordLoginAttempt(attempt: {
    email: string;
    ipAddress?: string;
    occurredAt: Date;
    succeeded: boolean;
  }): Promise<void> {
    await recordUserLoginAttempt(this.db, attempt);
  }
  async revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void> {
    await revokeUserRefreshTokens(this.db, input);
  }

  async updatePreferredPortal(
    userId: string,
    preferredPortal: string | null,
  ): Promise<void> {
    await updateUserPreferredPortal(this.db, userId, preferredPortal);
  }

  async setLockout(userId: string, lockedUntil: Date): Promise<void> {
    await setUserLockout(this.db, userId, lockedUntil);
  }

  // ─── Email verification ───────────────────────────────────────────

  async findEmailVerificationUser(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    emailVerified: boolean;
  } | null> {
    return findEmailVerificationUser(this.db, userId);
  }

  async setEmailVerified(userId: string): Promise<void> {
    await setUserEmailVerified(this.db, userId);
  }

  // ─── Password reset ──────────────────────────────────────────────

  async findPasswordResetUser(email: string): Promise<{
    id: string;
    email: string;
    firstName: string;
  } | null> {
    return findPasswordResetUser(this.db, email);
  }

  // ─── Google OAuth ────────────────────────────────────────────────

  async findUserByOAuthIdentity(
    provider: string,
    providerUserId: string,
  ): Promise<AuthUserRecord | null> {
    return findUserByOAuthIdentity(this.db, provider, providerUserId);
  }

  async createOAuthUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatarUrl: string | null;
    provider: string;
    providerUserId: string;
    providerEmail: string;
    now: Date;
  }): Promise<AuthUserRecord> {
    return createOAuthUser(this.db, this.basicUserRoleService, input);
  }

  async linkOAuthIdentity(input: {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail: string;
    displayName: string | null;
    avatarUrl: string | null;
    now: Date;
  }): Promise<void> {
    await linkOAuthIdentity(this.db, input);
  }
}
