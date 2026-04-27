import {
  type AuthNotificationPreferences,
  type AuthPermissionSet,
  type AuthUser,
  authUserSchema,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { AuthUserRecord } from "./authentication.service.js";
import {
  assertPreferredPortalAllowed,
  normalizePreferredPortal,
} from "./portal-access.js";

export interface CurrentUserRepository {
  findUserById(userId: string): Promise<AuthUserRecord | null>;
  updateProfile(
    userId: string,
    input: {
      firstName?: string;
      notificationPreferences?: AuthNotificationPreferences;
      lastName?: string;
      preferredPortal?: string | null;
    },
  ): Promise<void>;
}

export interface CurrentUserPermissionLookup {
  getCurrentPermissions(userId: string): Promise<AuthPermissionSet>;
}

export class CurrentUserService {
  constructor(
    private readonly repository: CurrentUserRepository,
    private readonly permissionLookup?: CurrentUserPermissionLookup,
  ) {}

  async updateProfile(
    userId: string,
    input: {
      firstName?: string;
      notificationPreferences?: AuthNotificationPreferences;
      lastName?: string;
      preferredPortal?: string | null;
    },
  ): Promise<void> {
    const user = await this.repository.findUserById(userId);

    if (!user || user.status !== "active") {
      throw invalidAccessTokenError();
    }

    await this.repository.updateProfile(userId, {
      ...("firstName" in input && input.firstName !== undefined
        ? { firstName: input.firstName }
        : {}),
      ...("lastName" in input && input.lastName !== undefined
        ? { lastName: input.lastName }
        : {}),
      ...(input.notificationPreferences
        ? { notificationPreferences: input.notificationPreferences }
        : {}),
      ...("preferredPortal" in input
        ? {
            preferredPortal: assertPreferredPortalAllowed({
              availablePortals: user.availablePortals,
              preferredPortal: input.preferredPortal ?? null,
            }),
          }
        : {}),
    });
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.repository.findUserById(userId);

    if (!user || user.status !== "active") {
      throw invalidAccessTokenError();
    }

    const permissionSet = this.permissionLookup
      ? await this.permissionLookup.getCurrentPermissions(userId)
      : { locationScopes: [], permissions: [] };

    return authUserSchema.parse({
      availablePortals: user.availablePortals,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      hasPassword: Boolean(user.passwordHash),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastName: user.lastName,
      permissionSet,
      primaryImageUrl: user.primaryImageUrl,
      notificationPreferences: user.notificationPreferences,
      preferredPortal: normalizePreferredPortal({
        availablePortals: user.availablePortals,
        preferredPortal: user.preferredPortal,
      }),
      requiresPasswordChange: user.requiresPasswordChange,
      slug: user.slug,
      status: user.status,
    });
  }
}

function invalidAccessTokenError(): AppError {
  return new AppError({
    code: "unauthorized",
    detail: "The access token is invalid or has expired.",
    statusCode: 401,
    title: "Invalid access token",
  });
}
