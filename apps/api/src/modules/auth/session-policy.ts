import { AppError } from "../_core/errors/app-error.js";
import type { AuthUserRecord } from "./authentication.service.js";

export type RefreshDenialReason =
  | "account_locked"
  | "password_change_required"
  | "user_unavailable";

export function getRefreshDenialReason(
  user: AuthUserRecord | null,
  now: Date,
): RefreshDenialReason | null {
  if (!user || user.status !== "active") {
    return "user_unavailable";
  }

  if (isLockoutActive(user.lockedUntil, now)) {
    return "account_locked";
  }

  if (user.requiresPasswordChange) {
    return "password_change_required";
  }

  return null;
}

export function isLockoutActive(
  lockedUntil: Date | null | undefined,
  now: Date,
): boolean {
  return lockedUntil !== null && lockedUntil !== undefined && lockedUntil > now;
}

export function invalidSessionError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "The session is invalid or has expired.",
    statusCode: 401,
    title: "Invalid session",
  });
}
