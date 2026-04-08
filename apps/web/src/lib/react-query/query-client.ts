import type { ProblemDetails } from "@shop/contracts";
import { QueryClient } from "@tanstack/react-query";
import { getDisplayErrorMessage } from "@/lib/errors/problem-details";

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

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return failureCount < 2;
    }

    if (error.status >= 500) {
      return failureCount < 2;
    }

    return false;
  }

  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: 0,
      },
      queries: {
        retry: shouldRetryQuery,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
