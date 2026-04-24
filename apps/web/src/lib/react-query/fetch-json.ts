import { getAccessToken, refreshAccessToken } from "@/lib/auth/auth-client";
import { resolveApiUrl } from "@/lib/auth/resolve-api-url";
import { toNetworkError } from "@/lib/errors/app-error";
import { parseProblemDetails } from "@/lib/errors/problem-details";
import { ApiError } from "@/lib/react-query/query-client";

type FetchJsonOptions = {
  auth?: "none" | "required";
};

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchJsonOptions = {},
): Promise<T> {
  return requestJson<T>(input, init, options, false);
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: FetchJsonOptions,
  hasRetried: boolean,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (options.auth === "required") {
    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(resolveRequestInput(input), {
      ...init,
      headers,
    });
  } catch (error) {
    throw toNetworkError(error);
  }

  if (response.status === 401 && options.auth === "required" && !hasRetried) {
    const session = await refreshAccessToken();

    if (session) {
      return requestJson<T>(input, init, options, true);
    }
  }

  if (!response.ok) {
    const problem = await parseProblemDetails(response.clone());

    throw new ApiError({
      problem,
      status: response.status,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function resolveRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string") {
    return input;
  }

  return resolveApiUrl(input);
}
