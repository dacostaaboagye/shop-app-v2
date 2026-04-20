import { getAccessToken, refreshAccessToken } from "@/lib/auth/auth-client";
import { resolveApiUrl } from "@/lib/auth/resolve-api-url";
import { toNetworkError } from "@/lib/errors/app-error";
import { parseProblemDetails } from "@/lib/errors/problem-details";
import { ApiError } from "@/lib/react-query/query-client";

type FetchFileOptions = {
  auth?: "none" | "required";
  fallbackFilename: string;
};

export async function fetchFile(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: FetchFileOptions,
): Promise<File> {
  return requestFile(input, init, options, false);
}

async function requestFile(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: FetchFileOptions,
  hasRetried: boolean,
): Promise<File> {
  const response = await requestResponse(input, init, options, hasRetried);
  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(
      response.headers.get("Content-Disposition"),
    ) ?? options.fallbackFilename;

  return new File([blob], filename, {
    type:
      blob.type ||
      response.headers.get("Content-Type") ||
      "application/octet-stream",
  });
}

async function requestResponse(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: FetchFileOptions,
  hasRetried: boolean,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "*/*");
  }

  if (options.auth === "required") {
    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(resolveRequestInput(input), { ...init, headers });
  } catch (error) {
    throw toNetworkError(error);
  }

  if (response.status === 401 && options.auth === "required" && !hasRetried) {
    const session = await refreshAccessToken();

    if (session) {
      return requestResponse(input, init, options, true);
    }
  }

  if (!response.ok) {
    throw new ApiError({
      problem: await parseProblemDetails(response.clone()),
      status: response.status,
    });
  }

  return response;
}

function resolveRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  return typeof input === "string" ? resolveApiUrl(input) : input;
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded) return decodeURIComponent(encoded);

  const quoted = /filename="([^"]+)"/i.exec(header)?.[1];
  if (quoted) return quoted;

  return /filename=([^;]+)/i.exec(header)?.[1]?.trim() ?? null;
}
