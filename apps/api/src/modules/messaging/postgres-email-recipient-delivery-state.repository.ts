import {
  emailDeliveryAttempts,
  emailDeliveryStatusEvents,
} from "@shop/database";
import { desc, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailDeliveryStatus } from "./email-service.types.js";

export type RecipientDeliveryLifecycleState = {
  occurredAt: Date;
  status: EmailDeliveryStatus;
  statusReason: string | null;
};

export class PostgresEmailRecipientDeliveryStateRepository {
  constructor(private readonly db: ApiDatabase) {}

  async findLatestLifecycleState(
    recipientEmail: string,
  ): Promise<RecipientDeliveryLifecycleState | null> {
    const [row] = await this.db
      .select({
        occurredAt: emailDeliveryStatusEvents.occurredAt,
        status: emailDeliveryStatusEvents.status,
        statusReason: emailDeliveryStatusEvents.statusReason,
      })
      .from(emailDeliveryStatusEvents)
      .innerJoin(
        emailDeliveryAttempts,
        eq(emailDeliveryStatusEvents.attemptId, emailDeliveryAttempts.id),
      )
      .where(eq(emailDeliveryAttempts.recipientEmail, recipientEmail))
      .orderBy(
        desc(emailDeliveryStatusEvents.occurredAt),
        desc(emailDeliveryStatusEvents.receivedAt),
      )
      .limit(1);

    return row ?? null;
  }
}
