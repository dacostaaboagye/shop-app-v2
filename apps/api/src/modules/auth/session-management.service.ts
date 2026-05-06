import type { AuthSessionListResponse } from "@shop/contracts";
import { hashRefreshToken } from "./session.service.js";

export type SessionInventoryCommand = {
  currentRefreshToken?: string;
  userId: string;
};

export type LogoutAllSessionsCommand = {
  ipAddress?: string;
  userAgent?: string;
  userId: string;
};

export type StoredSessionRecord = {
  expiresAt: Date;
  id: string;
  ipAddress: string | null;
  issuedAt: Date;
  tokenHash: string;
  userAgent: string | null;
};

export interface SessionManagementRepository {
  listActiveRefreshTokensForUser(input: {
    now: Date;
    userId: string;
  }): Promise<StoredSessionRecord[]>;
  recordAuthEvent(input: {
    eventType: "logout";
    ipAddress?: string;
    occurredAt: Date;
    userAgent?: string;
    userId: string;
  }): Promise<void>;
  revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void>;
}

export class SessionManagementService {
  constructor(
    private readonly repository: SessionManagementRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listSessions(
    command: SessionInventoryCommand,
  ): Promise<AuthSessionListResponse> {
    const currentTokenHash = command.currentRefreshToken
      ? hashRefreshToken(command.currentRefreshToken)
      : null;
    const sessions = await this.repository.listActiveRefreshTokensForUser({
      now: this.now(),
      userId: command.userId,
    });

    return {
      sessions: sessions.map((session) => ({
        current: currentTokenHash === session.tokenHash,
        expiresAt: session.expiresAt.toISOString(),
        ipAddress: session.ipAddress,
        issuedAt: session.issuedAt.toISOString(),
        userAgent: session.userAgent,
      })),
    };
  }

  async logoutAll(command: LogoutAllSessionsCommand): Promise<void> {
    const now = this.now();

    await this.repository.revokeRefreshTokensForUser({
      revokedAt: now,
      revokedReason: "logout_all",
      userId: command.userId,
    });
    await this.repository.recordAuthEvent({
      eventType: "logout",
      ...(command.ipAddress ? { ipAddress: command.ipAddress } : {}),
      occurredAt: now,
      ...(command.userAgent ? { userAgent: command.userAgent } : {}),
      userId: command.userId,
    });
  }
}
