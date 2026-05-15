import {
  authEvents,
  loginAttempts,
  refreshTokens,
  users,
} from "@shop/database";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export async function recordUserAuthEvent(
  db: ApiDatabase,
  event: {
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
  },
): Promise<void> {
  await db.insert(authEvents).values({
    userId: event.userId ?? null,
    eventType: event.eventType,
    ipAddress: event.ipAddress ?? null,
    userAgent: event.userAgent ?? null,
    occurredAt: event.occurredAt,
  });
}

export async function recordUserLoginAttempt(
  db: ApiDatabase,
  attempt: {
    email: string;
    ipAddress?: string;
    occurredAt: Date;
    succeeded: boolean;
  },
): Promise<void> {
  await db.insert(loginAttempts).values({
    email: attempt.email,
    ipAddress: attempt.ipAddress ?? null,
    succeeded: attempt.succeeded,
    occurredAt: attempt.occurredAt,
  });
}

export async function revokeUserRefreshTokens(
  db: ApiDatabase,
  input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  },
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        sessionsRevokedAt: input.revokedAt,
        updatedAt: input.revokedAt,
      })
      .where(eq(users.id, input.userId));

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
  });
}
