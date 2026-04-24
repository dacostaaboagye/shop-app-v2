import { QueryClient } from "@tanstack/react-query";
import {
  ApiError,
  isRetryableAppError,
  NetworkError,
} from "@/lib/errors/app-error";

export { ApiError, NetworkError } from "@/lib/errors/app-error";

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (error instanceof ApiError || error instanceof NetworkError) {
    return isRetryableAppError(error) && failureCount < 2;
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
