import type { FastifyInstance } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { AuthRouteDependencies } from "./auth-route-support.js";

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
  _dependencies: AuthRouteDependencies,
) {
  server.route({
    config: {
      access: googleOAuthInitiateRoute.access,
      rateLimit: { max: 20, timeWindow: "15 minutes" },
    },
    method: googleOAuthInitiateRoute.method,
    url: googleOAuthInitiateRoute.url,
    async handler() {
      throw operationsOAuthDisabledError();
    },
  });

  server.route({
    config: {
      access: googleOAuthCallbackRoute.access,
      rateLimit: { max: 20, timeWindow: "15 minutes" },
    },
    method: googleOAuthCallbackRoute.method,
    url: googleOAuthCallbackRoute.url,
    async handler() {
      throw operationsOAuthDisabledError();
    },
  });
}

function operationsOAuthDisabledError() {
  return new AppError({
    code: "forbidden",
    detail:
      "Google sign-in is disabled for the operations portal. Sign in with your internal account credentials or ask an administrator to provision your account.",
    statusCode: 403,
    title: "OAuth disabled",
  });
}
