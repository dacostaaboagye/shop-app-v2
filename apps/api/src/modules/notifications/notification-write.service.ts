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
    return {
      updatedCount: await this.repository.markAllRead(input),
    };
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
