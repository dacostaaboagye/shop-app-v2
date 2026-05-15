import { refreshTokens, users } from "@shop/database";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AuthUserRecord } from "./authentication.service.js";
import { findAuthUser } from "./postgres-auth-user-record.js";
import type { PostgresUserRepository } from "./postgres-user.repository.js";
import { recordUserAuthEvent } from "./postgres-user-auth-events.js";
import type {
  SessionRepository,
  StoredRefreshTokenRecord,
} from "./session.service.js";

export class PostgresSessionRepository implements SessionRepository {
  constructor(
    private readonly db: ApiDatabase,
    private readonly userRepository: PostgresUserRepository,
  ) {}

  async createRefreshToken(input: {
    expiresAt: Date;
    ipAddress?: string;
    issuedAt: Date;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): Promise<void> {
    await this.db.insert(refreshTokens).values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<StoredRefreshTokenRecord | null> {
    const [row] = await this.db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        issuedAt: refreshTokens.issuedAt,
        expiresAt: refreshTokens.expiresAt,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    return (row as StoredRefreshTokenRecord) ?? null;
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.userRepository.findUserById(userId);
  }

  async recordAuthEvent(input: {
    eventType: "logout" | "token_refresh";
    ipAddress?: string;
    occurredAt: Date;
    userAgent?: string;
    userId: string;
  }): Promise<void> {
    await this.userRepository.recordAuthEvent(input);
  }

  async revokeRefreshToken(input: {
    revokedAt: Date;
    revokedReason: string;
    tokenId: string;
  }): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({
        revokedAt: input.revokedAt,
        revokedReason: input.revokedReason,
      })
      .where(eq(refreshTokens.id, input.tokenId));
  }

  async revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
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

  async rotateRefreshToken(input: {
    expiresAt: Date;
    ipAddress?: string;
    issuedAt: Date;
    newTokenHash: string;
    refreshTokenHash: string;
    userAgent?: string;
  }): Promise<AuthUserRecord | null> {
    return this.db.transaction(async (tx) => {
      const [tokenOwner] = await tx
        .select({
          userId: refreshTokens.userId,
        })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, input.refreshTokenHash))
        .limit(1);

      if (!tokenOwner) {
        return null;
      }

      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, tokenOwner.userId))
        .for("update")
        .limit(1);

      const [storedToken] = await tx
        .select({
          id: refreshTokens.id,
          userId: refreshTokens.userId,
          issuedAt: refreshTokens.issuedAt,
          expiresAt: refreshTokens.expiresAt,
          revokedAt: refreshTokens.revokedAt,
        })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, input.refreshTokenHash))
        .for("update")
        .limit(1);

      if (
        !storedToken ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= input.issuedAt
      ) {
        return null;
      }

      const user = await findAuthUser(tx, eq(users.id, storedToken.userId));

      if (
        !user ||
        user.status !== "active" ||
        (user.sessionsRevokedAt &&
          storedToken.issuedAt <= user.sessionsRevokedAt)
      ) {
        return null;
      }

      await tx
        .update(refreshTokens)
        .set({
          revokedAt: input.issuedAt,
          revokedReason: "rotated",
        })
        .where(eq(refreshTokens.id, storedToken.id));

      await tx.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: input.newTokenHash,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });

      await recordUserAuthEvent(tx, {
        eventType: "token_refresh",
        occurredAt: input.issuedAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        userId: user.id,
      });

      return user;
    });
  }
}
