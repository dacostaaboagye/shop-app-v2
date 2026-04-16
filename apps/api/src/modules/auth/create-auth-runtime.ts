import type { ApiEnv } from "../../env.js";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { BasicUserRoleService } from "../access-control/basic-user-role.service.js";
import { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { PostgresPermissionRepository } from "../access-control/postgres-permission.repository.js";
import { PostgresSlugRepository } from "../public-identifiers/postgres-slug.repository.js";
import { SlugService } from "../public-identifiers/slug.service.js";
import { AccessTokenAuthenticationService } from "./access-token-authentication.service.js";
import { PasswordAuthenticationService } from "./authentication.service.js";
import { CurrentUserService } from "./current-user.service.js";
import { CurrentUserPermissionService } from "./current-user-permission.service.js";
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
    currentUserPermissionService: CurrentUserPermissionService;
    currentUserService: CurrentUserService;
    logoutSessionService: TokenSessionService;
    profileUpdateService: CurrentUserService;
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
    databaseRuntime.db,
    new BasicUserRoleService(),
  );
  const slugService = new SlugService(
    new PostgresSlugRepository(databaseRuntime.db),
  );
  const sessionService = new TokenSessionService(
    new PostgresSessionRepository(databaseRuntime.db, userRepository),
    {
      accessTokenSecret: env.authAccessTokenSecret,
      accessTokenTtlSeconds: env.authAccessTokenTtlSeconds,
      refreshTokenTtlSeconds: env.authRefreshTokenTtlSeconds,
    },
  );
  const permissionService = new PermissionResolutionService(
    new PostgresPermissionRepository(databaseRuntime.db),
  );

  return {
    accessControl: {
      accessTokenAuthenticationService: new AccessTokenAuthenticationService(
        userRepository,
        env.authAccessTokenSecret,
      ),
      permissionService,
    },
    auth: {
      authenticationService: new PasswordAuthenticationService(
        userRepository,
        sessionService,
      ),
      currentUserPermissionService: new CurrentUserPermissionService(
        permissionService,
      ),
      currentUserService: new CurrentUserService(userRepository),
      logoutSessionService: sessionService,
      profileUpdateService: new CurrentUserService(userRepository),
      refreshSessionService: sessionService,
      registrationService: new PasswordRegistrationService(
        userRepository,
        sessionService,
        slugService,
      ),
    },
    userAccessLifecycleService: new UserAccessLifecycleService(userRepository),
  };
}
