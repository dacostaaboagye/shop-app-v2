import {
  type AuthPermissionSet,
  type AuthUser,
  authSessionSchema,
} from "@shop/contracts";
import type { FastifyRequest } from "fastify";
import { AppError } from "../_core/errors/app-error.js";
import type { IssuedSession, LoginCommand } from "./authentication.service.js";
import { refreshTokenCookieName } from "./refresh-token-cookie.js";
import type { RegisterCommand } from "./registration.service.js";
import type {
  LogoutSessionCommand,
  RefreshSessionCommand,
} from "./session.service.js";

export type AuthRouteDependencies = {
  authenticationService: {
    login(command: LoginCommand): Promise<IssuedSession>;
  };
  currentUserService: {
    getCurrentUser(userId: string): Promise<AuthUser>;
  };
  currentUserPermissionService: {
    getCurrentPermissions(userId: string): Promise<AuthPermissionSet>;
  };
  logoutSessionService: {
    logout(command: LogoutSessionCommand): Promise<void>;
  };
  profileUpdateService: {
    updatePreferredPortal(
      userId: string,
      preferredPortal: string | null,
    ): Promise<void>;
  };
  registrationService: {
    register(command: RegisterCommand): Promise<IssuedSession>;
  };
  refreshSessionService: {
    refresh(command: RefreshSessionCommand): Promise<IssuedSession>;
  };
};

export function createUnavailableAuthDependencies(): AuthRouteDependencies {
  return {
    authenticationService: {
      async login() {
        throw unavailableAuthError();
      },
    },
    currentUserService: {
      async getCurrentUser() {
        throw unavailableAuthError();
      },
    },
    currentUserPermissionService: {
      async getCurrentPermissions() {
        throw unavailableAuthError();
      },
    },
    logoutSessionService: {
      async logout() {
        throw unavailableAuthError();
      },
    },
    profileUpdateService: {
      async updatePreferredPortal() {
        throw unavailableAuthError();
      },
    },
    registrationService: {
      async register() {
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

export function getRequestMetadata(request: FastifyRequest): {
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

export function getRefreshToken(request: FastifyRequest): string {
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

export function getAuthenticatedUserId(request: FastifyRequest): string {
  const userId = request.auth?.userId;

  if (!userId) {
    throw new AppError({
      code: "unauthorized",
      detail: "A valid bearer access token is required for this route.",
      statusCode: 401,
      title: "Authentication required",
    });
  }

  return userId;
}

export function toPublicSession(session: IssuedSession) {
  return authSessionSchema.parse({
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    user: session.user,
  });
}

function unavailableAuthError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Authentication services are not configured for this environment.",
    statusCode: 503,
    title: "Authentication unavailable",
  });
}

function getUserAgent(request: FastifyRequest): string | undefined {
  const userAgent = request.headers["user-agent"];

  return Array.isArray(userAgent) ? userAgent[0] : userAgent;
}
