import type { ApiEnv } from "../../env.js";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { BasicUserRoleService } from "../access-control/basic-user-role.service.js";
import { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { PostgresPermissionRepository } from "../access-control/postgres-permission.repository.js";
import { AccessTokenAuthenticationService } from "./access-token-authentication.service.js";
import { PasswordAuthenticationService } from "./authentication.service.js";
import { PostgresSessionRepository } from "./postgres-session.repository.js";
import { PostgresUserRepository } from "./postgres-user.repository.js";
import { PasswordRegistrationService } from "./registration.service.js";
import { TokenSessionService } from "./session.service.js";
import { UserAccessLifecycleService } from "./user-access-lifecycle.service.js";

type AuthRuntime = {
  accessControl: {
    accessTokenAuthenticationService: AccessTokenAuthenticationService;
    permissionService: PermissionResolutionService;
  };
  auth: {
    authenticationService: PasswordAuthenticationService;
    logoutSessionService: TokenSessionService;
    refreshSessionService: TokenSessionService;
    registrationService: PasswordRegistrationService;
  };
  userAccessLifecycleService: UserAccessLifecycleService;
};

export function createAuthRuntime(
  databaseRuntime: DatabaseRuntime,
  env: ApiEnv,
): AuthRuntime {
  if (!env.authAccessTokenSecret) {
    throw new Error("AUTH_ACCESS_TOKEN_SECRET must be configured.");
  }

  const userRepository = new PostgresUserRepository(
    databaseRuntime.pool,
    new BasicUserRoleService(),
  );
  const sessionService = new TokenSessionService(
    new PostgresSessionRepository(databaseRuntime.pool, userRepository),
    {
      accessTokenSecret: env.authAccessTokenSecret,
      accessTokenTtlSeconds: env.authAccessTokenTtlSeconds,
      refreshTokenTtlSeconds: env.authRefreshTokenTtlSeconds,
    },
  );

  return {
    accessControl: {
      accessTokenAuthenticationService: new AccessTokenAuthenticationService(
        userRepository,
        env.authAccessTokenSecret,
      ),
      permissionService: new PermissionResolutionService(
        new PostgresPermissionRepository(databaseRuntime.pool),
      ),
    },
    auth: {
      authenticationService: new PasswordAuthenticationService(
        userRepository,
        sessionService,
      ),
      logoutSessionService: sessionService,
      refreshSessionService: sessionService,
      registrationService: new PasswordRegistrationService(
        userRepository,
        sessionService,
      ),
    },
    userAccessLifecycleService: new UserAccessLifecycleService(userRepository),
  };
}
