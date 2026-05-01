import { AppError } from "../_core/errors/app-error.js";
import type { PostgresNotificationWriteRepository } from "./postgres-notification-write.repository.js";

export class NotificationWriteService {
  constructor(
    private readonly repository: Pick<
      PostgresNotificationWriteRepository,
      "deleteNotification" | "markAllRead" | "markRead"
    >,
  ) {}

  async deleteNotification(input: { notificationKey: string; userId: string }) {
    const deleted = await this.repository.deleteNotification(input);

    if (!deleted) {
      throw new AppError({
        code: "not_found",
        detail: `Notification ${input.notificationKey} was not found.`,
        statusCode: 404,
        title: "Notification not found",
      });
    }
  }

  async markAllRead(input: { now: Date; userId: string }) {
    const updatedCount = await this.repository.markAllRead(input);
    // The operation just marked every currently-unread row as read. Any
    // notifications that race in *after* the UPDATE land as unread and will
    // surface via the SSE listener; we don't try to second-guess them here.
    return { updatedCount, newUnreadCount: 0 };
  }

  async markRead(input: {
    notificationKey: string;
    now: Date;
    userId: string;
  }) {
    const row = await this.repository.markRead(input);
    if (!row) {
      throw new AppError({
        code: "not_found",
        detail: `Notification ${input.notificationKey} was not found.`,
        statusCode: 404,
        title: "Notification not found",
      });
    }

    return {
      notificationKey: row.notificationKey,
      readAt: row.readAt?.toISOString() ?? null,
      status: row.status,
    };
  }
}
