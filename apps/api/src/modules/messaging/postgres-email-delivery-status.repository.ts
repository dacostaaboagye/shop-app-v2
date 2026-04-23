import {
  emailDeliveryAttempts,
  emailDeliveryStatusEvents,
} from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailDeliveryStatus } from "./email-service.types.js";

export class PostgresEmailDeliveryStatusRepository {
  constructor(private readonly db: ApiDatabase) {}

  async findAttemptIdByProviderMessageId(
    providerMessageId: string,
  ): Promise<string | null> {
    const row = await this.db.query.emailDeliveryAttempts.findFirst({
      columns: { id: true },
      where: eq(emailDeliveryAttempts.providerMessageId, providerMessageId),
    });

    return row?.id ?? null;
  }

  async recordStatusEvent(input: {
    attemptId: string | null;
    occurredAt: Date;
    provider: "resend";
    providerEventId: string;
    providerEventType: string;
    providerMessageId: string;
    receivedAt: Date;
    status: EmailDeliveryStatus;
    statusReason?: string | null;
  }): Promise<{ inserted: boolean }> {
    const rows = await this.db
      .insert(emailDeliveryStatusEvents)
      .values({
        attemptId: input.attemptId,
        occurredAt: input.occurredAt,
        provider: input.provider,
        providerEventId: input.providerEventId,
        providerEventType: input.providerEventType,
        providerMessageId: input.providerMessageId,
        receivedAt: input.receivedAt,
        status: input.status,
        statusReason: input.statusReason ?? null,
      })
      .onConflictDoNothing({
        target: emailDeliveryStatusEvents.providerEventId,
      })
      .returning({ id: emailDeliveryStatusEvents.id });

    return { inserted: rows.length > 0 };
  }
}
