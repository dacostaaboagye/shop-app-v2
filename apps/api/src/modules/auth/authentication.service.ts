import type { AuthSession, AuthUser } from "@shop/contracts";
import {
  type AuthLockoutPolicy,
  countRecentFailures,
  defaultAuthLockoutPolicy,
  getFailedAttemptOutcome,
  getFailureWindowStart,
  getRemainingLockoutSeconds,
  isLockoutActive,
} from "@shop/domain";
import {
  type AuthEventRecord,
  invalidCredentialsError,
  type LoginAttemptRecord,
  lockedAccountError,
  oauthOnlyAccountError,
  passwordChangeRequiredError,
  type SessionContext,
  toAuthEventRecord,
  toLoginAttemptRecord,
  toSessionContext,
  unavailableAccountError,
} from "./authentication-records.js";
import { verifyPassword } from "./password-hash.js";

export type { SessionContext } from "./authentication-records.js";

export type IssuedSession = AuthSession & {
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type AuthUserRecord = Omit<AuthUser, "lastLoginAt"> & {
  id: string;
  lastLoginAt: Date | null;
  lockedUntil: Date | null;
  passwordHash: string | null;
  primaryImageUrl: string | null;
};

export type LoginCommand = {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
};

export interface AuthRepository {
  clearLockout(userId: string): Promise<void>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  getRecentFailedAttemptTimes(email: string, since: Date): Promise<Date[]>;
  markSuccessfulLogin(userId: string, occurredAt: Date): Promise<void>;
  recordAuthEvent(event: AuthEventRecord): Promise<void>;
  recordLoginAttempt(attempt: LoginAttemptRecord): Promise<void>;
  revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void>;
  setLockout(userId: string, lockedUntil: Date): Promise<void>;
}

export interface SessionIssuer {
  issueSession(
    user: AuthUserRecord,
    now: Date,
    context?: SessionContext,
  ): Promise<IssuedSession>;
}

export class PasswordAuthenticationService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sessionIssuer: SessionIssuer,
    private readonly now: () => Date = () => new Date(),
    private readonly policy: AuthLockoutPolicy = defaultAuthLockoutPolicy,
  ) {}

  async login(command: LoginCommand): Promise<IssuedSession> {
    const now = this.now();
    const email = command.email.trim().toLowerCase();
    const user = await this.repository.findUserByEmail(email);

    if (!user) {
      await this.recordFailedAttempt({ command, occurredAt: now });
      throw invalidCredentialsError();
    }

    if (user.status === "suspended") {
      throw unavailableAccountError("This account is suspended.");
    }

    if (user.status === "deactivated") {
      throw unavailableAccountError("This account is deactivated.");
    }

    if (isLockoutActive({ lockedUntil: user.lockedUntil, now })) {
      throw lockedAccountError(
        getRemainingLockoutSeconds({ lockedUntil: user.lockedUntil, now }),
      );
    }

    if (user.requiresPasswordChange) {
      throw passwordChangeRequiredError();
    }

    const recentFailures = await this.repository.getRecentFailedAttemptTimes(
      email,
      getFailureWindowStart(now, this.policy),
    );

    if (!user.passwordHash) {
      throw oauthOnlyAccountError();
    }

    if (!verifyPassword(command.password, user.passwordHash)) {
      await this.recordFailedAttempt({
        command,
        occurredAt: now,
        recentFailures,
        user,
      });
      throw invalidCredentialsError();
    }

    await this.repository.recordLoginAttempt(
      toLoginAttemptRecord({
        email,
        ipAddress: command.ipAddress,
        occurredAt: now,
        succeeded: true,
      }),
    );
    await this.repository.clearLockout(user.id);
    await this.repository.markSuccessfulLogin(user.id, now);
    await this.repository.recordAuthEvent(
      toAuthEventRecord({
        eventType: "login",
        ipAddress: command.ipAddress,
        occurredAt: now,
        userAgent: command.userAgent,
        userId: user.id,
      }),
    );

    return this.sessionIssuer.issueSession(
      user,
      now,
      toSessionContext(command.ipAddress, command.userAgent),
    );
  }

  private async recordFailedAttempt(input: {
    command: LoginCommand;
    occurredAt: Date;
    recentFailures?: Date[];
    user?: AuthUserRecord;
  }): Promise<void> {
    const email = input.command.email.trim().toLowerCase();
    const recentFailures = input.recentFailures ?? [];

    await this.repository.recordLoginAttempt(
      toLoginAttemptRecord({
        email,
        ipAddress: input.command.ipAddress,
        occurredAt: input.occurredAt,
        succeeded: false,
      }),
    );
    await this.repository.recordAuthEvent(
      toAuthEventRecord({
        eventType: "failed_attempt",
        ipAddress: input.command.ipAddress,
        occurredAt: input.occurredAt,
        userAgent: input.command.userAgent,
        // userId is deliberately omitted on failed_attempt rows. Including
        // it only when the email maps to a real user lets an operator
        // browsing auth_events distinguish "wrong password against a real
        // account" from "unknown email" — the same enumeration channel the
        // generic "invalid credentials" response tries to close.
        // The login_attempts table still records `email` for support
        // workflows that need to triangulate failed logins.
        userId: undefined,
      }),
    );

    if (!input.user) {
      return;
    }

    const failureCount = countRecentFailures(
      recentFailures,
      input.occurredAt,
      this.policy,
    );
    const outcome = getFailedAttemptOutcome(
      failureCount,
      input.occurredAt,
      this.policy,
    );

    if (!outcome.lockedUntil) {
      return;
    }

    await this.repository.setLockout(input.user.id, outcome.lockedUntil);
    await this.repository.revokeRefreshTokensForUser({
      revokedAt: input.occurredAt,
      revokedReason: "account_locked",
      userId: input.user.id,
    });
    await this.repository.recordAuthEvent(
      toAuthEventRecord({
        eventType: "lockout",
        ipAddress: input.command.ipAddress,
        occurredAt: input.occurredAt,
        userAgent: input.command.userAgent,
        userId: input.user.id,
      }),
    );
  }
}
