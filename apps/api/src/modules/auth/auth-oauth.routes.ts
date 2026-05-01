import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AuthRouteDependencies } from "./auth-route-support.js";
import { getRequestMetadata } from "./auth-route-support.js";
import { setRefreshTokenCookie } from "./refresh-token-cookie.js";

const googleOAuthInitiateRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "GET",
  url: "/api/auth/oauth/google",
};

const googleOAuthCallbackRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "GET",
  url: "/api/auth/oauth/google/callback",
};

export function registerOAuthRoutes(
  server: FastifyInstance,
  dependencies: AuthRouteDependencies,
) {
  server.route({
    config: { access: googleOAuthInitiateRoute.access },
    method: googleOAuthInitiateRoute.method,
    url: googleOAuthInitiateRoute.url,
    async handler(_request, reply) {
      const url = await dependencies.googleOAuthService.initiateFlow(reply);
      return reply.redirect(url, 302);
    },
  });

  server.route({
    config: { access: googleOAuthCallbackRoute.access },
    method: googleOAuthCallbackRoute.method,
    url: googleOAuthCallbackRoute.url,
    async handler(request, reply) {
      const env = (await import("../../env.js")).getApiEnv();
      const oauthError = readOAuthError(request);

      if (oauthError) {
        return reply.redirect(
          `${env.webBaseUrl ?? ""}/login?oauth_error=${encodeURIComponent(oauthError)}`,
          302,
        );
      }

      try {
        const session = await dependencies.googleOAuthService.handleCallback(
          request,
          reply,
          getRequestMetadata(request),
        );
        setRefreshTokenCookie(
          reply,
          session.refreshToken,
          session.refreshTokenExpiresAt,
        );
        // Redirect web app to a callback page that bootstraps the session
        return reply.redirect(`${env.webBaseUrl ?? ""}/auth/callback`, 302);
      } catch (error) {
        // Surface domain errors as a login redirect rather than a JSON error
        // page; the user is mid-browser-redirect from Google.
        if (error instanceof AppError) {
          const oauthError =
            (error.details?.oauthError as string | undefined) ?? "auth_failed";
          return reply.redirect(
            `${env.webBaseUrl ?? ""}/login?oauth_error=${encodeURIComponent(oauthError)}`,
            302,
          );
        }
        throw error;
      }
    },
  });
}

function readOAuthError(request: { query: unknown }) {
  const query = request.query as Record<string, unknown>;
  return typeof query.error === "string" && query.error.length > 0
    ? query.error
    : null;
}
