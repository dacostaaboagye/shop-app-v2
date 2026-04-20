import type { NotificationListResponse } from "@shop/contracts";
import type { PostgresNotificationQueryRepository } from "./postgres-notification-query.repository.js";

export class NotificationQueryService {
  constructor(
    private readonly repository: Pick<
      PostgresNotificationQueryRepository,
      "countUnread" | "listByUser"
    >,
  ) {}

  async listNotifications(input: {
    limit: number;
    userId: string;
  }): Promise<NotificationListResponse> {
    const [items, unreadCount] = await Promise.all([
      this.repository.listByUser(input),
      this.repository.countUnread(input.userId),
    ]);

    return {
      items: items.map((item) => ({
        actorUserSlug: item.actorUserSlug,
        eventType: item.eventType,
        notificationKey: item.notificationKey,
        occurredAt: item.occurredAt.toISOString(),
        readAt: item.readAt?.toISOString() ?? null,
        resource: item.resource,
        status: item.status,
        summary: item.summary,
      })),
      unreadCount,
    };
  }
}
