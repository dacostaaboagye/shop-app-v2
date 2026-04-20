import { platformEventAudiences, platformEvents } from "@shop/database";
import { eq, inArray, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type {
  PlatformEventAudience,
  PlatformEventRecord,
} from "./platform-event.types.js";

export type PlatformEventAppendDatabase = Pick<ApiDatabase, "insert">;

type DeliveryStatus = "delivered" | "failed" | "pending" | "processing";

type ClaimedAudienceRow = {
  audienceKind: "permission" | "user";
  eventId: string;
  locationId: string | null;
  permissionKey: string | null;
  userId: string | null;
};

export type ClaimedPlatformEvent = {
  deliveryAttempts: number;
  event: PlatformEventRecord;
};

export class PostgresPlatformEventRepository {
  constructor(private readonly db: ApiDatabase) {}

  async append(event: PlatformEventRecord): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.appendWithinTransaction(event, tx);
    });
  }

  async appendWithinTransaction(
    event: PlatformEventRecord,
    db: PlatformEventAppendDatabase,
  ): Promise<void> {
    await db.insert(platformEvents).values({
      actorUserSlug: event.actor.userSlug,
      id: event.id,
      occurredAt: new Date(event.occurredAt),
      payload: event.payload,
      resourceKind: event.resource.kind,
      resourceReference: event.resource.reference,
      summary: event.summary,
      type: event.type,
    });

    if (!event.audience.length) {
      return;
    }

    await db.insert(platformEventAudiences).values(
      event.audience.map((audience) => ({
        audienceKind: audience.kind,
        eventId: event.id,
        ...(audience.kind === "user"
          ? { userId: audience.userId }
          : {
              ...(audience.locationId
                ? { locationId: audience.locationId }
                : {}),
              permissionKey: audience.permission,
            }),
      })),
    );
  }

  async claimPendingBatch(input: {
    limit: number;
    now: Date;
    staleProcessingBefore: Date;
  }): Promise<ClaimedPlatformEvent[]> {
    return this.db.transaction(async (tx) => {
      const claimableResult = await tx.execute(sql<{ id: string }>`
        select ${platformEvents.id} as "id"
        from ${platformEvents}
        where (
          ${platformEvents.deliveryStatus} = 'pending'
          and ${platformEvents.availableAt} <= ${input.now}
        ) or (
          ${platformEvents.deliveryStatus} = 'processing'
          and ${platformEvents.processingStartedAt} <= ${input.staleProcessingBefore}
        )
        order by ${platformEvents.occurredAt} asc, ${platformEvents.createdAt} asc
        for update skip locked
        limit ${input.limit}
      `);
      const eventIds = claimableResult.rows.map((row) => row.id) as string[];

      if (!eventIds.length) {
        return [];
      }

      const claimedRows = await tx
        .update(platformEvents)
        .set({
          deliveryAttempts: sql`${platformEvents.deliveryAttempts} + 1`,
          deliveryStatus: "processing",
          lastAttemptAt: input.now,
          lastError: null,
          processingStartedAt: input.now,
        })
        .where(inArray(platformEvents.id, eventIds))
        .returning({
          actorUserSlug: platformEvents.actorUserSlug,
          deliveryAttempts: platformEvents.deliveryAttempts,
          id: platformEvents.id,
          occurredAt: platformEvents.occurredAt,
          payload: platformEvents.payload,
          resourceKind: platformEvents.resourceKind,
          resourceReference: platformEvents.resourceReference,
          summary: platformEvents.summary,
          type: platformEvents.type,
        });

      if (!claimedRows.length) {
        return [];
      }

      const audienceRows = await tx
        .select({
          audienceKind: platformEventAudiences.audienceKind,
          eventId: platformEventAudiences.eventId,
          locationId: platformEventAudiences.locationId,
          permissionKey: platformEventAudiences.permissionKey,
          userId: platformEventAudiences.userId,
        })
        .from(platformEventAudiences)
        .where(inArray(platformEventAudiences.eventId, eventIds));

      const audiencesByEventId = new Map<string, PlatformEventAudience[]>();

      for (const row of audienceRows as ClaimedAudienceRow[]) {
        const current = audiencesByEventId.get(row.eventId) ?? [];
        current.push(toAudience(row));
        audiencesByEventId.set(row.eventId, current);
      }

      return claimedRows.map((row) => ({
        deliveryAttempts: row.deliveryAttempts,
        event: {
          actor: { userSlug: row.actorUserSlug },
          audience: audiencesByEventId.get(row.id) ?? [],
          id: row.id,
          occurredAt: row.occurredAt.toISOString(),
          payload: row.payload as Record<
            string,
            string | number | boolean | null
          >,
          resource: {
            kind: row.resourceKind,
            reference: row.resourceReference,
          },
          summary: row.summary,
          type: row.type,
        },
      }));
    });
  }

  async markDelivered(input: { eventId: string; now: Date }): Promise<void> {
    await this.db
      .update(platformEvents)
      .set({
        deliveredAt: input.now,
        deliveryStatus: "delivered" satisfies DeliveryStatus,
        lastError: null,
        processingStartedAt: null,
      })
      .where(eq(platformEvents.id, input.eventId));
  }

  async markFailed(input: {
    eventId: string;
    lastError: string;
    nextAvailableAt: Date;
    terminal: boolean;
  }): Promise<void> {
    await this.db
      .update(platformEvents)
      .set({
        availableAt: input.nextAvailableAt,
        deliveryStatus: input.terminal
          ? ("failed" satisfies DeliveryStatus)
          : ("pending" satisfies DeliveryStatus),
        lastError: input.lastError,
        processingStartedAt: null,
      })
      .where(eq(platformEvents.id, input.eventId));
  }
}

function toAudience(row: ClaimedAudienceRow): PlatformEventAudience {
  if (row.audienceKind === "user") {
    return {
      kind: "user",
      userId: row.userId ?? "",
    };
  }

  return {
    kind: "permission",
    ...(row.locationId ? { locationId: row.locationId } : {}),
    permission: row.permissionKey ?? "",
  };
}
