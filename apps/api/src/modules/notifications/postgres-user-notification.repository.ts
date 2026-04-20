import { userNotifications } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";

export class PostgresUserNotificationRepository {
  constructor(private readonly db: ApiDatabase) {}

  async createUnreadNotifications(input: {
    eventId: string;
    userIds: readonly string[];
  }): Promise<void> {
    if (!input.userIds.length) {
      return;
    }

    await this.db
      .insert(userNotifications)
      .values(
        input.userIds.map((userId) => ({
          eventId: input.eventId,
          userId,
        })),
      )
      .onConflictDoNothing({
        target: [userNotifications.userId, userNotifications.eventId],
      });
  }
}
