import type { Pool } from "pg";
import type { AuthUserRecord } from "./authentication.service.js";
import type { PostgresUserRepository } from "./postgres-user.repository.js";
import type {
  SessionRepository,
  StoredRefreshTokenRecord,
} from "./session.service.js";

export class PostgresSessionRepository implements SessionRepository {
  constructor(
    private readonly pool: Pool,
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
    await this.pool.query(
      `
        INSERT INTO refresh_tokens (
          user_id, token_hash, issued_at, expires_at, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        input.userId,
        input.tokenHash,
        input.issuedAt,
        input.expiresAt,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ],
    );
  }

  async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<StoredRefreshTokenRecord | null> {
    const result = await this.pool.query<StoredRefreshTokenRecord>(
      `
        SELECT
          id,
          user_id AS "userId",
          expires_at AS "expiresAt",
          revoked_at AS "revokedAt"
        FROM refresh_tokens
        WHERE token_hash = $1
        LIMIT 1
      `,
      [tokenHash],
    );

    return result.rows[0] ?? null;
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
    await this.pool.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = $2, revoked_reason = $3
        WHERE id = $1
      `,
      [input.tokenId, input.revokedAt, input.revokedReason],
    );
  }
}
