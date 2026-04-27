import {
  ApiError,
  getAppErrorDisplay,
  getAppErrorMessage,
} from "@/lib/errors/app-error";

type AuthMessage = {
  detail: string;
  title: string;
};

export function getAuthErrorMessage(error: unknown): AuthMessage {
  const display = getAppErrorDisplay(error, {
    fallbackDetail: "The request could not be completed. Please try again.",
    fallbackTitle: "Authentication failed",
  });

  if (!(error instanceof ApiError)) {
    return {
      detail: display.detail,
      title: display.title,
    };
  }

  const problem = error.problem;
  const title = display.title;
  const remainingLockoutSeconds = getRemainingLockoutSeconds(problem?.details);

  if (title === "Account locked" && remainingLockoutSeconds !== null) {
    return {
      detail: `${problem?.detail ?? "Too many failed login attempts."} Try again in ${formatRetryWindow(remainingLockoutSeconds)}.`,
      title,
    };
  }

  if (title === "Email delivery blocked") {
    return {
      detail:
        "We could not send email to this address right now. Contact support or ask an administrator to check your email delivery status before trying again.",
      title: "Email temporarily unavailable",
    };
  }

  if (title === "Email delivery failed") {
    return {
      detail:
        "We could not send that email right now. Please wait a moment and try again. If the problem continues, contact support.",
      title: "Email temporarily unavailable",
    };
  }

  return {
    detail: getAppErrorMessage(error, {
      fallbackDetail: "The request could not be completed. Please try again.",
      fallbackTitle: "Authentication failed",
    }),
    title: display.title,
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
