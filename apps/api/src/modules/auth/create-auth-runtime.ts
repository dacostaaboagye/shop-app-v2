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
import { EmailService } from "./email.service.js";
import { EmailVerificationService } from "./email-verification.service.js";
import { GoogleOAuthService } from "./google-oauth.service.js";
import { PasswordResetService } from "./password-reset.service.js";
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
    emailVerificationService: EmailVerificationService;
    googleOAuthService: GoogleOAuthService;
    logoutSessionService: TokenSessionService;
    passwordResetService: PasswordResetService;
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
  const emailService = new EmailService(
    env.resendApiKey,
    env.emailFromAddress,
    {
      allowConsoleFallback: env.nodeEnv !== "production",
    },
  );
  const webBaseUrl = env.webBaseUrl ?? "http://localhost:3000";

  const emailVerificationService = new EmailVerificationService(
    databaseRuntime.db,
    userRepository,
    emailService,
    webBaseUrl,
  );

  const passwordResetService = new PasswordResetService(
    databaseRuntime.db,
    userRepository,
    emailService,
    webBaseUrl,
  );

  const googleOAuthService =
    env.googleClientId && env.googleClientSecret && env.googleCallbackUrl
      ? new GoogleOAuthService(
          userRepository,
          sessionService,
          env.googleClientId,
          env.googleClientSecret,
          env.googleCallbackUrl,
          webBaseUrl,
          env.authCookieSecure,
        )
      : null;

  const registrationService = new PasswordRegistrationService(
    userRepository,
    sessionService,
    slugService,
    emailVerificationService,
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
      emailVerificationService,
      googleOAuthService: googleOAuthService ?? createUnavailableGoogleOAuth(),
      logoutSessionService: sessionService,
      passwordResetService,
      profileUpdateService: new CurrentUserService(userRepository),
      refreshSessionService: sessionService,
      registrationService,
    },
    userAccessLifecycleService: new UserAccessLifecycleService(userRepository),
  };
}

function createUnavailableGoogleOAuth(): GoogleOAuthService {
  // Returns a service that throws a clear error when Google OAuth is not configured
  return {
    initiateFlow: async () => {
      throw new (await import("../_core/errors/app-error.js")).AppError({
        code: "internal_error",
        statusCode: 503,
        title: "Google sign-in not configured",
        detail: "Google OAuth is not configured on this server.",
      });
    },
    handleCallback: async () => {
      throw new (await import("../_core/errors/app-error.js")).AppError({
        code: "internal_error",
        statusCode: 503,
        title: "Google sign-in not configured",
        detail: "Google OAuth is not configured on this server.",
      });
    },
  } as unknown as GoogleOAuthService;
}
