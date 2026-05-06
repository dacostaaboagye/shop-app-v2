import { refreshTokens } from "@shop/database";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AuthUserRecord } from "./authentication.service.js";
import type { PostgresUserRepository } from "./postgres-user.repository.js";
import type {
  SessionRepository,
  StoredRefreshTokenRecord,
} from "./session.service.js";
import type {
  SessionManagementRepository,
  StoredSessionRecord,
} from "./session-management.service.js";

export class PostgresSessionRepository
  implements SessionManagementRepository, SessionRepository
{
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
        expiresAt: refreshTokens.expiresAt,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    return (row as StoredRefreshTokenRecord) ?? null;
  }

  async listActiveRefreshTokensForUser(input: {
    now: Date;
    userId: string;
  }): Promise<StoredSessionRecord[]> {
    return this.db
      .select({
        id: refreshTokens.id,
        tokenHash: refreshTokens.tokenHash,
        issuedAt: refreshTokens.issuedAt,
        expiresAt: refreshTokens.expiresAt,
        ipAddress: refreshTokens.ipAddress,
        userAgent: refreshTokens.userAgent,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, input.userId),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, input.now),
        ),
      )
      .orderBy(refreshTokens.issuedAt);
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
    await this.db
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
}
