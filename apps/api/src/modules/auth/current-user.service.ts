import { type AuthUser, authUserSchema } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { AuthUserRecord } from "./authentication.service.js";
import {
  assertPreferredPortalAllowed,
  normalizePreferredPortal,
} from "./portal-access.js";

export interface CurrentUserRepository {
  findUserById(userId: string): Promise<AuthUserRecord | null>;
  updatePreferredPortal(
    userId: string,
    preferredPortal: string | null,
  ): Promise<void>;
}

export class CurrentUserService {
  constructor(private readonly repository: CurrentUserRepository) {}

  async updatePreferredPortal(
    userId: string,
    preferredPortal: string | null,
  ): Promise<void> {
    const user = await this.repository.findUserById(userId);

    if (!user || user.status !== "active") {
      throw invalidAccessTokenError();
    }

    await this.repository.updatePreferredPortal(
      userId,
      assertPreferredPortalAllowed({
        availablePortals: user.availablePortals,
        preferredPortal,
      }),
    );
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.repository.findUserById(userId);

    if (!user || user.status !== "active") {
      throw invalidAccessTokenError();
    }

    return authUserSchema.parse({
      availablePortals: user.availablePortals,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastName: user.lastName,
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
