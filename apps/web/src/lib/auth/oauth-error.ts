import { toRoute } from "@/lib/routes";

export type OAuthCallbackErrorCode =
  | "access_denied"
  | "server_error"
  | "temporarily_unavailable"
  | "unknown";

type OAuthErrorNotice = {
  description: string;
  title: string;
};

const LOGIN_ROUTE = "/login";

export function normalizeOAuthCallbackErrorCode(
  value?: string | null,
): OAuthCallbackErrorCode | null {
  if (!value) {
    return null;
  }

  if (
    value === "access_denied" ||
    value === "server_error" ||
    value === "temporarily_unavailable"
  ) {
    return value;
  }

  return "unknown";
}

export function resolveOAuthCallbackNotice(
  value?: string | null,
): OAuthErrorNotice | null {
  const code = normalizeOAuthCallbackErrorCode(value);

  if (!code) {
    return null;
  }

  switch (code) {
    case "access_denied":
      return {
        description:
          "Google sign-in was cancelled or denied. Choose another sign-in method or try Google again when ready.",
        title: "Google sign-in cancelled",
      };
    case "server_error":
      return {
        description:
          "Google could not complete sign-in right now. Please try again in a moment.",
        title: "Google sign-in unavailable",
      };
    case "temporarily_unavailable":
      return {
        description:
          "Google sign-in is temporarily unavailable. Please try again shortly.",
        title: "Google sign-in unavailable",
      };
    case "unknown":
      return {
        description:
          "Google sign-in did not complete successfully. Please try again.",
        title: "Google sign-in failed",
      };
  }
}

export function buildLoginHrefWithOAuthError(
  value?: string | null,
  nextPath?: string | null,
) {
  const code = normalizeOAuthCallbackErrorCode(value);
  const params = new URLSearchParams();

  if (nextPath) {
    params.set("next", nextPath);
  }

  if (code) {
    params.set("oauth_error", code);
  }

  const query = params.toString();

  return toRoute(query ? `${LOGIN_ROUTE}?${query}` : LOGIN_ROUTE);
}
