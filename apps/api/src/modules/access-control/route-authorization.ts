import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteAccess } from "../_core/route-contract.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthenticatedActor;
  }
}

type RouteAuthorizationDependencies = {
  accessTokenAuthenticationService?: {
    authenticate(token: string): Promise<AuthenticatedActor>;
  };
  permissionService?: {
    assertHasPermission(input: {
      permission: string;
      request: FastifyRequest;
      user: AuthenticatedActor;
    }): Promise<void>;
  };
};

export function registerRouteAuthorization(
  server: FastifyInstance,
  dependencies: RouteAuthorizationDependencies = {},
) {
  server.addHook("onRequest", async (request) => {
    const access = getRouteAccess(request);

    if (!access || access.kind === "public") {
      return;
    }

    const accessTokenAuthenticationService =
      dependencies.accessTokenAuthenticationService;

    if (!accessTokenAuthenticationService) {
      throw unavailableAuthorizationError();
    }

    const auth = await accessTokenAuthenticationService.authenticate(
      getBearerToken(request),
    );

    request.auth = auth;

    if (access.kind !== "permission") {
      return;
    }

    const permissionService = dependencies.permissionService;

    if (!permissionService) {
      throw unavailableAuthorizationError();
    }

    await permissionService.assertHasPermission({
      permission: access.permission,
      request,
      user: auth,
    });
  });
}

function getRouteAccess(request: FastifyRequest): RouteAccess | null {
  const config = request.routeOptions.config;

  if (!config || typeof config !== "object" || !("access" in config)) {
    return null;
  }

  const access = config.access;

  if (!access || typeof access !== "object" || !("kind" in access)) {
    return null;
  }

  return access as RouteAccess;
}

function getBearerToken(request: FastifyRequest): string {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw missingAccessTokenError();
  }

  const [scheme, token, ...rest] = authorization.split(" ");

  if (scheme !== "Bearer" || !token || rest.length > 0) {
    throw missingAccessTokenError();
  }

  return token;
}

function missingAccessTokenError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "A valid bearer access token is required for this route.",
    statusCode: 401,
    title: "Authentication required",
  });
}

function unavailableAuthorizationError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Authorization services are not configured for this environment.",
    statusCode: 503,
    title: "Authorization unavailable",
  });
}
