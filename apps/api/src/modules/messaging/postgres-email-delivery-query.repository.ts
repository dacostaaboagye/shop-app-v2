import {
  emailDeliveryAttempts,
  emailDeliveryStatusEvents,
} from "@shop/database";
import { desc, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailDeliveryStatus } from "./email-service.types.js";

export type EmailDeliveryAttemptRow = {
  createdAt: Date;
  failureReason: string | null;
  hasLifecycleUpdates: boolean;
  messageType: string;
  provider: string;
  providerMessageId: string | null;
  recipientEmail: string;
  status: EmailDeliveryStatus;
  statusRecordedAt: Date;
  subject: string;
};

export class PostgresEmailDeliveryQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async listRecentAttempts(limit: number): Promise<EmailDeliveryAttemptRow[]> {
    const attempts = await this.db
      .select({
        id: emailDeliveryAttempts.id,
        createdAt: emailDeliveryAttempts.createdAt,
        failureReason: emailDeliveryAttempts.failureReason,
        messageType: emailDeliveryAttempts.messageType,
        provider: emailDeliveryAttempts.provider,
        providerMessageId: emailDeliveryAttempts.providerMessageId,
        recipientEmail: emailDeliveryAttempts.recipientEmail,
        status: emailDeliveryAttempts.status,
        subject: emailDeliveryAttempts.subject,
      })
      .from(emailDeliveryAttempts)
      .orderBy(desc(emailDeliveryAttempts.createdAt))
      .limit(limit);

    const attemptIds = attempts.map((attempt) => attempt.id);
    const statusEvents =
      attemptIds.length === 0
        ? []
        : await this.db
            .select({
              attemptId: emailDeliveryStatusEvents.attemptId,
              occurredAt: emailDeliveryStatusEvents.occurredAt,
              receivedAt: emailDeliveryStatusEvents.receivedAt,
              status: emailDeliveryStatusEvents.status,
              statusReason: emailDeliveryStatusEvents.statusReason,
            })
            .from(emailDeliveryStatusEvents)
            .where(inArray(emailDeliveryStatusEvents.attemptId, attemptIds))
            .orderBy(
              desc(emailDeliveryStatusEvents.occurredAt),
              desc(emailDeliveryStatusEvents.receivedAt),
            );

    const latestStatusByAttemptId = new Map<
      string,
      {
        occurredAt: Date;
        status: EmailDeliveryStatus;
        statusReason: string | null;
      }
    >();

    for (const event of statusEvents) {
      if (!event.attemptId || latestStatusByAttemptId.has(event.attemptId)) {
        continue;
      }

      latestStatusByAttemptId.set(event.attemptId, {
        occurredAt: event.occurredAt,
        status: event.status,
        statusReason: event.statusReason,
      });
    }

    return attempts.map((attempt) => {
      const latestStatus = latestStatusByAttemptId.get(attempt.id);

      return {
        createdAt: attempt.createdAt,
        failureReason: latestStatus?.statusReason ?? attempt.failureReason,
        hasLifecycleUpdates: Boolean(latestStatus),
        messageType: attempt.messageType,
        provider: attempt.provider,
        providerMessageId: attempt.providerMessageId,
        recipientEmail: attempt.recipientEmail,
        status: latestStatus?.status ?? attempt.status,
        statusRecordedAt: latestStatus?.occurredAt ?? attempt.createdAt,
        subject: attempt.subject,
      };
    });
  }
}
