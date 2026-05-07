import { createHash, randomBytes } from "node:crypto";
import type { AuthPermissionSet } from "@shop/contracts";
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

export type LogoutAllSessionsCommand = {
  ipAddress?: string;
  userAgent?: string;
  userId: string;
};

export type StoredRefreshTokenRecord = {
  expiresAt: Date;
  id: string;
  issuedAt: Date;
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
  revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void>;
  rotateRefreshToken(input: {
    expiresAt: Date;
    ipAddress?: string;
    issuedAt: Date;
    newTokenHash: string;
    refreshTokenHash: string;
    userAgent?: string;
  }): Promise<AuthUserRecord | null>;
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
  logoutAll(command: LogoutAllSessionsCommand): Promise<void>;
}

export interface SessionPermissionLookup {
  getCurrentPermissions(userId: string): Promise<AuthPermissionSet>;
}

export class TokenSessionService
  implements LogoutSessionService, RefreshSessionService, SessionIssuer
{
  constructor(
    private readonly repository: SessionRepository,
    private readonly config: SessionServiceConfig,
    private readonly now: () => Date = () => new Date(),
    private readonly permissionLookup?: SessionPermissionLookup,
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

    const permissionSet = this.permissionLookup
      ? await this.permissionLookup.getCurrentPermissions(user.id)
      : { locationScopes: [], permissions: [] };

    return {
      accessToken: issuedAccessToken.token,
      accessTokenExpiresAt: issuedAccessToken.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user: mapAuthUser(user, permissionSet),
    };
  }

  async refresh(command: RefreshSessionCommand): Promise<IssuedSession> {
    const now = this.now();
    const refreshTokenHash = hashRefreshToken(command.refreshToken);
    const refreshToken = randomBytes(48).toString("base64url");
    const newTokenHash = hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = new Date(
      now.getTime() + this.config.refreshTokenTtlSeconds * 1000,
    );
    const user = await this.repository.rotateRefreshToken({
      expiresAt: refreshTokenExpiresAt,
      ...(command.ipAddress ? { ipAddress: command.ipAddress } : {}),
      issuedAt: now,
      newTokenHash,
      refreshTokenHash,
      ...(command.userAgent ? { userAgent: command.userAgent } : {}),
    });

    if (!user) {
      throw invalidSessionError();
    }

    return this.buildSession(user, now, refreshToken, refreshTokenExpiresAt);
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

  private async buildSession(
    user: AuthUserRecord,
    now: Date,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ): Promise<IssuedSession> {
    const issuedAccessToken = issueAccessToken({
      expiresInSeconds: this.config.accessTokenTtlSeconds,
      now,
      secret: this.config.accessTokenSecret,
      userId: user.id,
      userSlug: user.slug,
    });
    const permissionSet = this.permissionLookup
      ? await this.permissionLookup.getCurrentPermissions(user.id)
      : { locationScopes: [], permissions: [] };

    return {
      accessToken: issuedAccessToken.token,
      accessTokenExpiresAt: issuedAccessToken.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user: mapAuthUser(user, permissionSet),
    };
  }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function mapAuthUser(
  user: AuthUserRecord,
  permissionSet: AuthPermissionSet,
): IssuedSession["user"] {
  const availablePortals = user.availablePortals ?? [];

  return {
    availablePortals,
    email: user.email,
    emailVerified: user.emailVerified,
    firstName: user.firstName,
    hasPassword: Boolean(user.passwordHash),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastName: user.lastName,
    notificationPreferences: user.notificationPreferences,
    permissionSet,
    primaryImageUrl: user.primaryImageUrl ?? null,
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
