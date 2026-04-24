import type { FastifyInstance } from "fastify";
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
      const env = (await import("../../env.js")).getApiEnv();
      return reply.redirect(`${env.webBaseUrl ?? ""}/auth/callback`, 302);
    },
  });
}
