import { platformEvents, userNotifications } from "@shop/database";
import { desc, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type NotificationListRow = {
  actorUserSlug: string;
  eventType: string;
  notificationKey: string;
  occurredAt: Date;
  payload: Record<string, string | number | boolean | null>;
  readAt: Date | null;
  resource: {
    kind: string;
    reference: string;
  };
  status: "read" | "unread";
  summary: string;
};

export class PostgresNotificationQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async countUnread(userId: string): Promise<number> {
    const [row] = await this.db
      .select({
        unreadCount: sql<number>`cast(count(*) filter (where ${userNotifications.status} = 'unread') as int)`,
      })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId));

    return row?.unreadCount ?? 0;
  }

  async listByUser(input: {
    limit: number;
    userId: string;
  }): Promise<NotificationListRow[]> {
    const rows = await this.db
      .select({
        actorUserSlug: platformEvents.actorUserSlug,
        eventType: platformEvents.type,
        notificationKey: userNotifications.id,
        occurredAt: platformEvents.occurredAt,
        payload: platformEvents.payload,
        readAt: userNotifications.readAt,
        resourceKind: platformEvents.resourceKind,
        resourceReference: platformEvents.resourceReference,
        status: userNotifications.status,
        summary: platformEvents.summary,
      })
      .from(userNotifications)
      .innerJoin(
        platformEvents,
        eq(platformEvents.id, userNotifications.eventId),
      )
      .where(eq(userNotifications.userId, input.userId))
      .orderBy(
        sql`case when ${userNotifications.status} = 'unread' then 0 else 1 end`,
        desc(platformEvents.occurredAt),
        desc(userNotifications.createdAt),
      )
      .limit(input.limit);

    return rows.map((row) => ({
      actorUserSlug: row.actorUserSlug,
      eventType: row.eventType,
      notificationKey: row.notificationKey,
      occurredAt: row.occurredAt,
      payload: toNotificationPayload(row.payload),
      readAt: row.readAt,
      resource: {
        kind: row.resourceKind,
        reference: row.resourceReference,
      },
      status: row.status,
      summary: row.summary,
    }));
  }
}

function toNotificationPayload(
  payload: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(payload).filter(
      (entry): entry is [string, string | number | boolean | null] =>
        isNotificationPayloadValue(entry[1]),
    ),
  );
}

function isNotificationPayloadValue(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
