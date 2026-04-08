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
import { AppError } from "../_core/errors/app-error.js";
import { verifyPassword } from "./password-hash.js";

export type AuthUserRecord = Omit<AuthUser, "lastLoginAt"> & {
  id: string;
  lastLoginAt: Date | null;
  lockedUntil: Date | null;
  passwordHash: string;
};

export type LoginCommand = {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
};

type LoginAttemptRecord = {
  email: string;
  ipAddress?: string;
  occurredAt: Date;
  succeeded: boolean;
};

type AuthEventRecord = {
  eventType: "failed_attempt" | "lockout" | "login";
  ipAddress?: string;
  occurredAt: Date;
  userAgent?: string;
  userId?: string;
};

export interface AuthRepository {
  clearLockout(userId: string): Promise<void>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  getRecentFailedAttemptTimes(email: string, since: Date): Promise<Date[]>;
  markSuccessfulLogin(userId: string, occurredAt: Date): Promise<void>;
  recordAuthEvent(event: AuthEventRecord): Promise<void>;
  recordLoginAttempt(attempt: LoginAttemptRecord): Promise<void>;
  setLockout(userId: string, lockedUntil: Date): Promise<void>;
}

export interface SessionIssuer {
  issueSession(user: AuthUserRecord, now: Date): Promise<AuthSession>;
}

export class PasswordAuthenticationService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sessionIssuer: SessionIssuer,
    private readonly now: () => Date = () => new Date(),
    private readonly policy: AuthLockoutPolicy = defaultAuthLockoutPolicy,
  ) {}

  async login(command: LoginCommand): Promise<AuthSession> {
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
      throw lockedAccountError(user.lockedUntil, now);
    }

    const recentFailures = await this.repository.getRecentFailedAttemptTimes(
      email,
      getFailureWindowStart(now, this.policy),
    );

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

    return this.sessionIssuer.issueSession(user, now);
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
        userId: input.user?.id,
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

function invalidCredentialsError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "The email or password is incorrect.",
    statusCode: 401,
    title: "Invalid credentials",
  });
}

function unavailableAccountError(detail: string): AppError {
  return new AppError({
    code: "forbidden",
    detail,
    statusCode: 403,
    title: "Account unavailable",
  });
}

function lockedAccountError(lockedUntil: Date | null, now: Date): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "Too many failed login attempts. Try again later.",
    details: {
      remainingLockoutSeconds: getRemainingLockoutSeconds({ lockedUntil, now }),
    },
    statusCode: 401,
    title: "Account locked",
  });
}

function toLoginAttemptRecord(input: {
  email: string;
  ipAddress: string | undefined;
  occurredAt: Date;
  succeeded: boolean;
}): LoginAttemptRecord {
  return {
    email: input.email,
    ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    occurredAt: input.occurredAt,
    succeeded: input.succeeded,
  };
}

function toAuthEventRecord(input: {
  eventType: "failed_attempt" | "lockout" | "login";
  ipAddress: string | undefined;
  occurredAt: Date;
  userAgent: string | undefined;
  userId: string | undefined;
}): AuthEventRecord {
  return {
    eventType: input.eventType,
    ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    occurredAt: input.occurredAt,
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
  };
}
