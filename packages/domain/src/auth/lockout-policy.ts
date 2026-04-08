export type AuthLockoutPolicy = {
  lockoutMinutes: number;
  maxFailedAttempts: number;
  rollingWindowMinutes: number;
};

export type LockoutStateInput = {
  lockedUntil: Date | null;
  now: Date;
};

export const defaultAuthLockoutPolicy: AuthLockoutPolicy = {
  lockoutMinutes: 15,
  maxFailedAttempts: 5,
  rollingWindowMinutes: 15,
};

export function getFailureWindowStart(
  now: Date,
  policy: AuthLockoutPolicy = defaultAuthLockoutPolicy,
): Date {
  return new Date(now.getTime() - policy.rollingWindowMinutes * 60_000);
}

export function countRecentFailures(
  failureTimes: Date[],
  now: Date,
  policy: AuthLockoutPolicy = defaultAuthLockoutPolicy,
): number {
  const windowStart = getFailureWindowStart(now, policy);

  return failureTimes.filter((failureTime) => failureTime >= windowStart)
    .length;
}

export function getRemainingLockoutSeconds({
  lockedUntil,
  now,
}: LockoutStateInput): number {
  if (!lockedUntil || lockedUntil <= now) {
    return 0;
  }

  return Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
}

export function isLockoutActive(input: LockoutStateInput): boolean {
  return getRemainingLockoutSeconds(input) > 0;
}

export function getLockoutExpiry(
  now: Date,
  policy: AuthLockoutPolicy = defaultAuthLockoutPolicy,
): Date {
  return new Date(now.getTime() + policy.lockoutMinutes * 60_000);
}

export function getFailedAttemptOutcome(
  recentFailureCount: number,
  now: Date,
  policy: AuthLockoutPolicy = defaultAuthLockoutPolicy,
): {
  lockedUntil: Date | null;
  nextFailureCount: number;
} {
  const nextFailureCount = recentFailureCount + 1;

  return {
    lockedUntil:
      nextFailureCount >= policy.maxFailedAttempts
        ? getLockoutExpiry(now, policy)
        : null,
    nextFailureCount,
  };
}
