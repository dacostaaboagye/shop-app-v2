import {
  type AuthSession,
  authSessionSchema,
  type LoginRequest,
  type RegisterRequest,
} from "@shop/contracts";
import { toNetworkError } from "@/lib/errors/app-error";
import { parseProblemDetails } from "@/lib/errors/problem-details";
import { ApiError } from "@/lib/react-query/query-client";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { resolveApiUrl } from "./resolve-api-url";

export function getGoogleOAuthUrl(): string {
  return resolveApiUrl("/api/auth/oauth/google");
}

type JsonRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

let refreshInFlight: Promise<AuthSession | null> | null = null;

export async function login(input: LoginRequest): Promise<AuthSession> {
  const session = await requestAuthSession("/api/auth/login", {
    body: input,
    method: "POST",
  });

  useAuthSessionStore.getState().setSession(session);

  return session;
}

export async function register(input: RegisterRequest): Promise<AuthSession> {
  const session = await requestAuthSession("/api/auth/register", {
    body: input,
    method: "POST",
  });

  useAuthSessionStore.getState().setSession(session);

  return session;
}

export async function logout(): Promise<void> {
  try {
    await request("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    useAuthSessionStore.getState().clearSession();
  }
}

export function getAccessToken(): string | null {
  return useAuthSessionStore.getState().accessToken;
}

export async function refreshAccessToken(): Promise<AuthSession | null> {
  refreshInFlight ??= refreshAccessTokenOnce();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function refreshAccessTokenOnce(): Promise<AuthSession | null> {
  const previousSession = getStoredSessionSnapshot();
  useAuthSessionStore.getState().setRefreshing();

  try {
    const session = await requestAuthSession("/api/auth/refresh", {
      method: "POST",
    });

    useAuthSessionStore.getState().setSession(session);

    return session;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      useAuthSessionStore.getState().clearSession();
      return null;
    }

    if (previousSession) {
      useAuthSessionStore.getState().setSession(previousSession);
    } else {
      useAuthSessionStore.getState().clearSession();
    }

    throw error;
  }
}

async function requestAuthSession(
  path: string,
  init: JsonRequestInit,
): Promise<AuthSession> {
  const response = await request(path, init);
  return authSessionSchema.parse(await response.json());
}

async function request(path: string, init: JsonRequestInit): Promise<Response> {
  const { body: _body, ...requestInit } = init;
  const headers = new Headers(init.headers);
  const requestBody =
    init.body !== undefined ? JSON.stringify(init.body) : undefined;

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(resolveApiUrl(path), {
      ...requestInit,
      credentials: "include",
      headers,
      ...(requestBody ? { body: requestBody } : {}),
    });
  } catch (error) {
    throw toNetworkError(error);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response;
}

async function toApiError(response: Response): Promise<ApiError> {
  const problem = await parseProblemDetails(response.clone());

  return new ApiError({
    problem,
    status: response.status,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await request("/api/auth/forgot-password", {
    body: { email },
    method: "POST",
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await request("/api/auth/reset-password", {
    body: { token, newPassword },
    method: "POST",
  });
}

export async function verifyEmail(token: string): Promise<void> {
  await request("/api/auth/verify-email", {
    body: { token },
    method: "POST",
  });
}

export async function resendVerification(): Promise<void> {
  await request("/api/auth/resend-verification", {
    method: "POST",
  });
}

function getStoredSessionSnapshot(): AuthSession | null {
  const { accessToken, accessTokenExpiresAt, user } =
    useAuthSessionStore.getState();

  if (!accessToken || !accessTokenExpiresAt || !user) {
    return null;
  }

  return {
    accessToken,
    accessTokenExpiresAt,
    user,
  };
}
