import type { ErrorCode, ProblemDetails } from "@shop/contracts";
import { getDisplayErrorMessage } from "./problem-details";

const DEFAULT_ERROR_DETAIL =
  "The request could not be completed. Please try again.";
const DEFAULT_ERROR_TITLE = "Something went wrong";
const DEFAULT_NETWORK_DETAIL =
  "We could not reach the server. Check your connection and try again.";
const DEFAULT_NETWORK_TITLE = "Connection issue";

export type AppErrorDisplay = {
  code: ErrorCode | null;
  detail: string;
  requestId: string | null;
  retryable: boolean;
  status: number | null;
  title: string;
};

type AppErrorDisplayOptions = {
  fallbackDetail?: string;
  fallbackTitle?: string;
};

export class ApiError extends Error {
  problem: ProblemDetails | null;
  status: number;

  constructor({
    message,
    problem,
    status,
  }: {
    message?: string;
    problem: ProblemDetails | null;
    status: number;
  }) {
    super(message ?? getDisplayErrorMessage(problem));
    this.name = "ApiError";
    this.problem = problem;
    this.status = status;
  }
}

export class NetworkError extends Error {
  cause: unknown;

  constructor({
    cause,
    message = DEFAULT_NETWORK_DETAIL,
  }: {
    cause?: unknown;
    message?: string;
  } = {}) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export function toNetworkError(error: unknown): NetworkError {
  return error instanceof NetworkError
    ? error
    : new NetworkError({ cause: error });
}

export function isRetryableAppError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof ApiError) {
    return error.status === 429 || error.status >= 500;
  }

  return false;
}

export function getAppErrorDisplay(
  error: unknown,
  options: AppErrorDisplayOptions = {},
): AppErrorDisplay {
  const fallbackDetail = options.fallbackDetail ?? DEFAULT_ERROR_DETAIL;
  const fallbackTitle = options.fallbackTitle ?? DEFAULT_ERROR_TITLE;

  if (error instanceof ApiError) {
    return {
      code: error.problem?.code ?? null,
      detail: error.problem?.detail ?? fallbackDetail,
      requestId: error.problem?.requestId ?? null,
      retryable: isRetryableAppError(error),
      status: error.status,
      title: error.problem?.title ?? fallbackTitle,
    };
  }

  if (error instanceof NetworkError) {
    return {
      code: null,
      detail: error.message || DEFAULT_NETWORK_DETAIL,
      requestId: null,
      retryable: true,
      status: null,
      title: options.fallbackTitle ?? DEFAULT_NETWORK_TITLE,
    };
  }

  if (error instanceof Error) {
    const detail = error.message.trim();

    return {
      code: null,
      detail: detail || fallbackDetail,
      requestId: null,
      retryable: false,
      status: null,
      title: fallbackTitle,
    };
  }

  return {
    code: null,
    detail: fallbackDetail,
    requestId: null,
    retryable: false,
    status: null,
    title: fallbackTitle,
  };
}

export function getAppErrorMessage(
  error: unknown,
  options: AppErrorDisplayOptions = {},
): string {
  const display = getAppErrorDisplay(error, options);

  if (!shouldExposeErrorReference()) {
    return display.detail;
  }

  return display.requestId
    ? `${display.detail} Reference ID: ${display.requestId}.`
    : display.detail;
}

export function shouldExposeErrorReference() {
  return process.env.NODE_ENV === "development";
}
