import { AppError } from "../_core/errors/app-error.js";

export type LoginAttemptRecord = {
  email: string;
  ipAddress?: string;
  occurredAt: Date;
  succeeded: boolean;
};

export type AuthEventRecord = {
  eventType: "failed_attempt" | "lockout" | "login";
  ipAddress?: string;
  occurredAt: Date;
  userAgent?: string;
  userId?: string;
};

export type SessionContext = {
  ipAddress?: string;
  userAgent?: string;
};

export function invalidCredentialsError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "The email or password is incorrect.",
    statusCode: 401,
    title: "Invalid credentials",
  });
}

export function unavailableAccountError(detail: string): AppError {
  return new AppError({
    code: "forbidden",
    detail,
    statusCode: 403,
    title: "Account unavailable",
  });
}

export function lockedAccountError(remainingLockoutSeconds: number): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "Too many failed login attempts. Try again later.",
    details: {
      remainingLockoutSeconds,
    },
    statusCode: 401,
    title: "Account locked",
  });
}

export function oauthOnlyAccountError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail:
      "This account was created with Google sign-in. Please use the 'Continue with Google' button to sign in.",
    statusCode: 401,
    title: "Use Google sign-in",
  });
}

export function passwordChangeRequiredError(): AppError {
  return new AppError({
    code: "forbidden",
    detail:
      "Your password must be reset before you can sign in. Use the password reset link or request a new reset email.",
    statusCode: 403,
    title: "Password reset required",
  });
}

export function toLoginAttemptRecord(input: {
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

export function toAuthEventRecord(input: {
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

export function toSessionContext(
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
