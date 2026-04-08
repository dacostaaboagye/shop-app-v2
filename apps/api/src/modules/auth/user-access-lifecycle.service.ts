import { AppError } from "../_core/errors/app-error.js";

export interface UserAccessLifecycleRepository {
  deactivateUser(userId: string, now: Date): Promise<boolean>;
  revokeRefreshTokensForUser(input: {
    revokedAt: Date;
    revokedReason: string;
    userId: string;
  }): Promise<void>;
}

export class UserAccessLifecycleService {
  constructor(
    private readonly repository: UserAccessLifecycleRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async deactivateUser(userId: string): Promise<void> {
    const now = this.now();
    const wasUpdated = await this.repository.deactivateUser(userId, now);

    if (!wasUpdated) {
      throw userNotFoundError();
    }

    await this.repository.revokeRefreshTokensForUser({
      revokedAt: now,
      revokedReason: "deactivated",
      userId,
    });
  }
}

function userNotFoundError(): AppError {
  return new AppError({
    code: "not_found",
    detail: "The requested user does not exist.",
    statusCode: 404,
    title: "User not found",
  });
}
