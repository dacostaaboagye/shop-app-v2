import { AppError } from "../_core/errors/app-error.js";
import { verifyAccessToken } from "./access-token.js";

export type AuthenticatedActor = {
  userId: string;
  userSlug: string;
};

export type AuthenticatedUserRecord = {
  id: string;
  slug: string;
  status: "active" | "deactivated" | "suspended";
};

export interface AccessTokenUserRepository {
  findUserById(userId: string): Promise<AuthenticatedUserRecord | null>;
}

export class AccessTokenAuthenticationService {
  constructor(
    private readonly repository: AccessTokenUserRepository,
    private readonly accessTokenSecret: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async authenticate(token: string): Promise<AuthenticatedActor> {
    const verifiedToken = verifyAccessToken({
      now: this.now(),
      secret: this.accessTokenSecret,
      token,
    });
    const user = await this.repository.findUserById(verifiedToken.userId);

    if (
      !user ||
      user.status !== "active" ||
      user.slug !== verifiedToken.userSlug
    ) {
      throw invalidAccessTokenError();
    }

    return {
      userId: user.id,
      userSlug: user.slug,
    };
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
