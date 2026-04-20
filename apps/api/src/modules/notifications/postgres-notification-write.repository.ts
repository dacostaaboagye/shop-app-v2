import { userNotifications } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

type NotificationWriteRow = {
  notificationKey: string;
  readAt: Date | null;
  status: "read" | "unread";
};

export class PostgresNotificationWriteRepository {
  constructor(private readonly db: ApiDatabase) {}

  async markAllRead(input: { now: Date; userId: string }): Promise<number> {
    const rows = await this.db
      .update(userNotifications)
      .set({
        readAt: input.now,
        status: "read",
      })
      .where(
        and(
          eq(userNotifications.userId, input.userId),
          eq(userNotifications.status, "unread"),
        ),
      )
      .returning({ notificationKey: userNotifications.id });

    return rows.length;
  }

  async markRead(input: {
    notificationKey: string;
    now: Date;
    userId: string;
  }): Promise<NotificationWriteRow | null> {
    const [updated] = await this.db
      .update(userNotifications)
      .set({
        readAt: input.now,
        status: "read",
      })
      .where(
        and(
          eq(userNotifications.id, input.notificationKey),
          eq(userNotifications.userId, input.userId),
          eq(userNotifications.status, "unread"),
        ),
      )
      .returning({
        notificationKey: userNotifications.id,
        readAt: userNotifications.readAt,
        status: userNotifications.status,
      });

    if (updated) {
      return updated;
    }

    const [existing] = await this.db
      .select({
        notificationKey: userNotifications.id,
        readAt: userNotifications.readAt,
        status: userNotifications.status,
      })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.id, input.notificationKey),
          eq(userNotifications.userId, input.userId),
        ),
      )
      .limit(1);

    return existing ?? null;
  }
}
