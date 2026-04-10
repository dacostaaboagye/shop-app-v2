import { getDisplayErrorMessage } from "@/lib/errors/problem-details";
import { ApiError } from "@/lib/react-query/query-client";

type AuthMessage = {
  detail: string;
  title: string;
};

export function getAuthErrorMessage(error: unknown): AuthMessage {
  if (!(error instanceof ApiError)) {
    return {
      detail: "The request could not be completed. Please try again.",
      title: "Authentication failed",
    };
  }

  const problem = error.problem;
  const title = problem?.title ?? "Authentication failed";
  const remainingLockoutSeconds = getRemainingLockoutSeconds(problem?.details);

  if (title === "Account locked" && remainingLockoutSeconds !== null) {
    return {
      detail: `${problem?.detail ?? "Too many failed login attempts."} Try again in ${formatRetryWindow(remainingLockoutSeconds)}.`,
      title,
    };
  }

  return {
    detail: getDisplayErrorMessage(problem),
    title,
  };
}

export function isUnauthorizedApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

function getRemainingLockoutSeconds(
  details: Record<string, unknown> | undefined,
): number | null {
  const remainingLockoutSeconds = details?.remainingLockoutSeconds;

  return typeof remainingLockoutSeconds === "number"
    ? remainingLockoutSeconds
    : null;
}

function formatRetryWindow(remainingLockoutSeconds: number): string {
  if (remainingLockoutSeconds < 60) {
    return `${remainingLockoutSeconds} seconds`;
  }

  const wholeMinutes = Math.floor(remainingLockoutSeconds / 60);
  const trailingSeconds = remainingLockoutSeconds % 60;

  if (trailingSeconds === 0) {
    return wholeMinutes === 1 ? "1 minute" : `${wholeMinutes} minutes`;
  }

  return `${wholeMinutes}m ${trailingSeconds}s`;
}
