import type {
  AdminSentCommunicationListQuery,
  AdminSentCommunicationListResponse,
} from "@shop/contracts";
import {
  locations,
  platformEventAudiences,
  platformEvents,
  users,
} from "@shop/database";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ApiDatabase } from "../../infrastructure/database.js";

const audienceUsers = alias(users, "audience_users");
const audienceLocations = alias(locations, "audience_locations");
const ADMIN_COMMUNICATION_EVENT_TYPE = "admin.communication.sent";

export class PostgresAdminCommunicationQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async listSent(
    input: AdminSentCommunicationListQuery,
  ): Promise<AdminSentCommunicationListResponse> {
    const where = and(
      eq(platformEvents.type, ADMIN_COMMUNICATION_EVENT_TYPE),
      input.q
        ? or(
            ilike(platformEvents.summary, `%${input.q}%`),
            sql`coalesce(${platformEvents.payload} ->> 'messageBody', '') ilike ${`%${input.q}%`}`,
            ilike(platformEvents.actorUserSlug, `%${input.q}%`),
            ilike(audienceUsers.email, `%${input.q}%`),
          )
        : undefined,
    );

    const [countRow] = await this.db
      .select({ count: count() })
      .from(platformEvents)
      .leftJoin(
        platformEventAudiences,
        eq(platformEventAudiences.eventId, platformEvents.id),
      )
      .leftJoin(
        audienceUsers,
        eq(audienceUsers.id, platformEventAudiences.userId),
      )
      .where(where);

    const rows = await this.db
      .select({
        actorUserSlug: platformEvents.actorUserSlug,
        audienceKind: platformEventAudiences.audienceKind,
        deliveryStatus: platformEvents.deliveryStatus,
        eventId: platformEvents.id,
        locationName: audienceLocations.name,
        messageBody: sql<string>`coalesce(${platformEvents.payload} ->> 'messageBody', '')`,
        occurredAt: platformEvents.occurredAt,
        permissionKey: platformEventAudiences.permissionKey,
        recipientEmail: audienceUsers.email,
        recipientFirstName: audienceUsers.firstName,
        recipientLastName: audienceUsers.lastName,
        sendEmail: sql<boolean>`coalesce((${platformEvents.payload} ->> 'sendEmail')::boolean, false)`,
        sendNotification: sql<boolean>`coalesce((${platformEvents.payload} ->> 'sendNotification')::boolean, true)`,
        subject: platformEvents.summary,
      })
      .from(platformEvents)
      .leftJoin(
        platformEventAudiences,
        eq(platformEventAudiences.eventId, platformEvents.id),
      )
      .leftJoin(
        audienceUsers,
        eq(audienceUsers.id, platformEventAudiences.userId),
      )
      .leftJoin(
        audienceLocations,
        eq(audienceLocations.id, platformEventAudiences.locationId),
      )
      .where(where)
      .orderBy(desc(platformEvents.occurredAt), desc(platformEvents.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    return {
      items: rows.map((row) => ({
        actorUserSlug: row.actorUserSlug,
        deliveryStatus: row.deliveryStatus,
        eventId: row.eventId,
        messageBody: row.messageBody || row.subject,
        occurredAt: row.occurredAt.toISOString(),
        recipientLabel: formatRecipientLabel({
          audienceKind: row.audienceKind,
          locationName: row.locationName,
          permissionKey: row.permissionKey,
          recipientEmail: row.recipientEmail,
          recipientFirstName: row.recipientFirstName,
          recipientLastName: row.recipientLastName,
        }),
        sendEmail: row.sendEmail,
        sendNotification: row.sendNotification,
        subject: row.subject,
      })),
      page: input.page,
      pageSize: input.pageSize,
      totalCount: countRow?.count ?? 0,
    };
  }
}

function formatRecipientLabel(input: {
  audienceKind: "permission" | "user" | null;
  locationName: string | null;
  permissionKey: string | null;
  recipientEmail: string | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
}) {
  if (input.audienceKind === "user") {
    const name = [input.recipientFirstName, input.recipientLastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (name && input.recipientEmail) {
      return `${name} (${input.recipientEmail})`;
    }

    return name || input.recipientEmail || "Direct recipient";
  }

  const permission = input.permissionKey
    ? input.permissionKey.replace(/[._-]+/g, " ")
    : "audience";
  const audience = permission.replace(/\b\w/g, (match) => match.toUpperCase());

  return input.locationName
    ? `${audience} at ${input.locationName}`
    : `${audience} (all locations)`;
}
