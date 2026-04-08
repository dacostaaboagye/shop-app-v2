import {
  authSessionSchema,
  loginRequestSchema,
  registerRequestSchema,
} from "@shop/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { RouteDefinition } from "../_core/route-contract.js";
import type { IssuedSession, LoginCommand } from "./authentication.service.js";
import {
  clearRefreshTokenCookie,
  refreshTokenCookieName,
  setRefreshTokenCookie,
} from "./refresh-token-cookie.js";
import type { RegisterCommand } from "./registration.service.js";
import type {
  LogoutSessionCommand,
  RefreshSessionCommand,
} from "./session.service.js";

type AuthRouteDependencies = {
  authenticationService: {
    login(command: LoginCommand): Promise<IssuedSession>;
  };
  logoutSessionService: {
    logout(command: LogoutSessionCommand): Promise<void>;
  };
  registrationService: {
    register(command: RegisterCommand): Promise<IssuedSession>;
  };
  refreshSessionService: {
    refresh(command: RefreshSessionCommand): Promise<IssuedSession>;
  };
};

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

export function registerAuthRoutes(
  server: FastifyInstance,
  dependencies: AuthRouteDependencies = createUnavailableAuthDependencies(),
) {
  server.route({
    config: { access: registerRoute.access },
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
    config: { access: loginRoute.access },
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
    config: { access: refreshRoute.access },
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
    config: { access: logoutRoute.access },
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
}

function createUnavailableAuthDependencies(): AuthRouteDependencies {
  return {
    authenticationService: {
      async login() {
        throw unavailableAuthError();
      },
    },
    registrationService: {
      async register() {
        throw unavailableAuthError();
      },
    },
    logoutSessionService: {
      async logout() {
        throw unavailableAuthError();
      },
    },
    refreshSessionService: {
      async refresh() {
        throw unavailableAuthError();
      },
    },
  };
}

function unavailableAuthError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Authentication services are not configured for this environment.",
    statusCode: 503,
    title: "Authentication unavailable",
  });
}

function getRequestMetadata(request: FastifyRequest): {
  ipAddress?: string;
  userAgent?: string;
} {
  const metadata: {
    ipAddress?: string;
    userAgent?: string;
  } = {};
  const userAgent = getUserAgent(request);

  if (request.ip) {
    metadata.ipAddress = request.ip;
  }

  if (userAgent) {
    metadata.userAgent = userAgent;
  }

  return metadata;
}

function getUserAgent(request: FastifyRequest): string | undefined {
  const userAgent = request.headers["user-agent"];

  return Array.isArray(userAgent) ? userAgent[0] : userAgent;
}

function getRefreshToken(request: FastifyRequest): string {
  const refreshToken = request.cookies[refreshTokenCookieName];

  if (!refreshToken) {
    throw new AppError({
      code: "unauthorized",
      detail: "Refresh token cookie is missing or invalid.",
      statusCode: 401,
      title: "Invalid session",
    });
  }

  return refreshToken;
}

function toPublicSession(session: IssuedSession) {
  return authSessionSchema.parse({
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    user: session.user,
  });
}
