import {
  authPermissionSetSchema,
  authUserSchema,
  loginRequestSchema,
  registerRequestSchema,
  updateProfileRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance } from "fastify";
import type { RouteDefinition } from "../_core/route-contract.js";
import { registerOAuthRoutes } from "./auth-oauth.routes.js";
import { registerRecoveryRoutes } from "./auth-recovery.routes.js";
import {
  type AuthRouteDependencies,
  createUnavailableAuthDependencies,
  getAuthenticatedUserId,
  getRefreshToken,
  getRequestMetadata,
  toPublicSession,
} from "./auth-route-support.js";
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "./refresh-token-cookie.js";

const registerRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/api/auth/register",
};

const loginRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/api/auth/login",
};

const refreshRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/api/auth/refresh",
};

const logoutRoute: RouteDefinition = {
  access: { kind: "public" },
  method: "POST",
  url: "/api/auth/logout",
};

const currentUserRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/auth/me",
};

const updateProfileRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "PATCH",
  url: "/api/auth/me",
};

const currentUserPermissionsRoute: RouteDefinition = {
  access: { kind: "authenticated" },
  method: "GET",
  url: "/api/auth/me/permissions",
};

export function registerAuthRoutes(
  server: FastifyInstance,
  dependencies: AuthRouteDependencies = createUnavailableAuthDependencies(),
) {
  server.route({
    config: {
      access: registerRoute.access,
      rateLimit: { max: 5, timeWindow: "1 hour" },
    },
    method: registerRoute.method,
    url: registerRoute.url,
    async handler(request, reply) {
      const command = registerRequestSchema.parse(request.body);
      const session = await dependencies.registrationService.register({
        ...command,
        ...getRequestMetadata(request),
      });
      setRefreshTokenCookie(
        reply,
        session.refreshToken,
        session.refreshTokenExpiresAt,
      );
      return toPublicSession(session);
    },
  });

  server.route({
    config: {
      access: loginRoute.access,
      rateLimit: { max: 10, timeWindow: "15 minutes" },
    },
    method: loginRoute.method,
    url: loginRoute.url,
    async handler(request, reply) {
      const command = loginRequestSchema.parse(request.body);
      const session = await dependencies.authenticationService.login({
        ...command,
        ...getRequestMetadata(request),
      });
      setRefreshTokenCookie(
        reply,
        session.refreshToken,
        session.refreshTokenExpiresAt,
      );
      return toPublicSession(session);
    },
  });

  server.route({
    config: {
      access: refreshRoute.access,
      rateLimit: { max: 60, timeWindow: "15 minutes" },
    },
    method: refreshRoute.method,
    url: refreshRoute.url,
    async handler(request, reply) {
      const session = await dependencies.refreshSessionService.refresh({
        ...getRequestMetadata(request),
        refreshToken: getRefreshToken(request),
      });
      setRefreshTokenCookie(
        reply,
        session.refreshToken,
        session.refreshTokenExpiresAt,
      );
      return toPublicSession(session);
    },
  });

  server.route({
    config: {
      access: logoutRoute.access,
      rateLimit: { max: 60, timeWindow: "15 minutes" },
    },
    method: logoutRoute.method,
    url: logoutRoute.url,
    async handler(request, reply) {
      await dependencies.logoutSessionService.logout({
        ...getRequestMetadata(request),
        refreshToken: getRefreshToken(request),
      });
      clearRefreshTokenCookie(reply);
      return reply.status(204).send();
    },
  });

  server.route({
    config: { access: currentUserRoute.access },
    method: currentUserRoute.method,
    url: currentUserRoute.url,
    async handler(request) {
      const user = await dependencies.currentUserService.getCurrentUser(
        getAuthenticatedUserId(request),
      );

      return authUserSchema.parse(user);
    },
  });

  server.route({
    config: { access: currentUserPermissionsRoute.access },
    method: currentUserPermissionsRoute.method,
    url: currentUserPermissionsRoute.url,
    async handler(request) {
      const permissions =
        await dependencies.currentUserPermissionService.getCurrentPermissions(
          getAuthenticatedUserId(request),
        );

      return authPermissionSetSchema.parse(permissions);
    },
  });

  server.route({
    config: { access: updateProfileRoute.access },
    method: updateProfileRoute.method,
    url: updateProfileRoute.url,
    async handler(request, reply) {
      const profile = updateProfileRequestSchema.parse(request.body);
      const nextProfile = {
        ...("firstName" in profile && profile.firstName !== undefined
          ? { firstName: profile.firstName }
          : {}),
        ...("lastName" in profile && profile.lastName !== undefined
          ? { lastName: profile.lastName }
          : {}),
        ...("notificationPreferences" in profile &&
        profile.notificationPreferences !== undefined
          ? { notificationPreferences: profile.notificationPreferences }
          : {}),
        ...("preferredPortal" in profile
          ? { preferredPortal: profile.preferredPortal ?? null }
          : {}),
      };
      await dependencies.profileUpdateService.updateProfile(
        getAuthenticatedUserId(request),
        nextProfile,
      );
      return reply.status(204).send();
    },
  });

  registerOAuthRoutes(server, dependencies);
  registerRecoveryRoutes(server, dependencies);
}
