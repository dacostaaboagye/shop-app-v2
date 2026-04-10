import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../_core/errors/app-error.js";
import { issueAccessToken } from "./access-token.js";
import type {
  AuthUserRecord,
  IssuedSession,
  SessionContext,
  SessionIssuer,
} from "./authentication.service.js";
import { normalizePreferredPortal } from "./portal-access.js";

export type RefreshSessionCommand = {
  ipAddress?: string;
  refreshToken: string;
  userAgent?: string;
};

export type LogoutSessionCommand = {
  ipAddress?: string;
  refreshToken: string;
  userAgent?: string;
};

export type StoredRefreshTokenRecord = {
  expiresAt: Date;
  id: string;
  revokedAt: Date | null;
  userId: string;
};

export interface SessionRepository {
  createRefreshToken(input: {
    expiresAt: Date;
    ipAddress?: string;
    issuedAt: Date;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): Promise<void>;
  findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<StoredRefreshTokenRecord | null>;
  findUserById(userId: string): Promise<AuthUserRecord | null>;
  recordAuthEvent(input: {
    eventType: "logout" | "token_refresh";
    ipAddress?: string;
    occurredAt: Date;
    userAgent?: string;
    userId: string;
  }): Promise<void>;
  revokeRefreshToken(input: {
    revokedAt: Date;
    revokedReason: string;
    tokenId: string;
  }): Promise<void>;
}

export type SessionServiceConfig = {
  accessTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
};

export interface RefreshSessionService {
  refresh(command: RefreshSessionCommand): Promise<IssuedSession>;
}

export interface LogoutSessionService {
  logout(command: LogoutSessionCommand): Promise<void>;
}

export class TokenSessionService
  implements LogoutSessionService, RefreshSessionService, SessionIssuer
{
  constructor(
    private readonly repository: SessionRepository,
    private readonly config: SessionServiceConfig,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async issueSession(
    user: AuthUserRecord,
    now: Date,
    context?: SessionContext,
  ): Promise<IssuedSession> {
    const issuedAccessToken = issueAccessToken({
      expiresInSeconds: this.config.accessTokenTtlSeconds,
      now,
      secret: this.config.accessTokenSecret,
      userId: user.id,
      userSlug: user.slug,
    });
    const refreshToken = randomBytes(48).toString("base64url");
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = new Date(
      now.getTime() + this.config.refreshTokenTtlSeconds * 1000,
    );

    await this.repository.createRefreshToken({
      expiresAt: refreshTokenExpiresAt,
      ...(context?.ipAddress ? { ipAddress: context.ipAddress } : {}),
      issuedAt: now,
      tokenHash: refreshTokenHash,
      ...(context?.userAgent ? { userAgent: context.userAgent } : {}),
      userId: user.id,
    });

    return {
      accessToken: issuedAccessToken.token,
      accessTokenExpiresAt: issuedAccessToken.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user: mapAuthUser(user),
    };
  }

  async refresh(command: RefreshSessionCommand): Promise<IssuedSession> {
    const now = this.now();
    const storedToken = await this.getActiveRefreshToken(
      command.refreshToken,
      now,
    );

    const user = await this.repository.findUserById(storedToken.userId);

    if (!user || user.status !== "active") {
      throw invalidSessionError();
    }

    await this.repository.revokeRefreshToken({
      revokedAt: now,
      revokedReason: "rotated",
      tokenId: storedToken.id,
    });

    await this.repository.recordAuthEvent({
      eventType: "token_refresh",
      ...(command.ipAddress ? { ipAddress: command.ipAddress } : {}),
      occurredAt: now,
      ...(command.userAgent ? { userAgent: command.userAgent } : {}),
      userId: storedToken.userId,
    });

    return this.issueSession(
      user,
      now,
      toSessionContext(command.ipAddress, command.userAgent),
    );
  }

  async logout(command: LogoutSessionCommand): Promise<void> {
    const now = this.now();
    const storedToken = await this.getActiveRefreshToken(
      command.refreshToken,
      now,
    );

    await this.repository.revokeRefreshToken({
      revokedAt: now,
      revokedReason: "logout",
      tokenId: storedToken.id,
    });
    await this.repository.recordAuthEvent({
      eventType: "logout",
      ...(command.ipAddress ? { ipAddress: command.ipAddress } : {}),
      occurredAt: now,
      ...(command.userAgent ? { userAgent: command.userAgent } : {}),
      userId: storedToken.userId,
    });
  }

  private async getActiveRefreshToken(
    refreshToken: string,
    now: Date,
  ): Promise<StoredRefreshTokenRecord> {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const storedToken =
      await this.repository.findRefreshTokenByHash(refreshTokenHash);

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= now) {
      throw invalidSessionError();
    }

    return storedToken;
  }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function mapAuthUser(user: AuthUserRecord): IssuedSession["user"] {
  const availablePortals = user.availablePortals ?? [];

  return {
    availablePortals,
    email: user.email,
    firstName: user.firstName,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastName: user.lastName,
    preferredPortal: normalizePreferredPortal({
      availablePortals,
      preferredPortal: user.preferredPortal,
    }),
    requiresPasswordChange: user.requiresPasswordChange,
    slug: user.slug,
    status: user.status,
  };
}

function invalidSessionError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "The session is invalid or has expired.",
    statusCode: 401,
    title: "Invalid session",
  });
}

function toSessionContext(
  ipAddress: string | undefined,
  userAgent: string | undefined,
): SessionContext | undefined {
  const context: SessionContext = {};

  if (ipAddress) {
    context.ipAddress = ipAddress;
  }

  if (userAgent) {
    context.userAgent = userAgent;
  }

  return Object.keys(context).length > 0 ? context : undefined;
}
