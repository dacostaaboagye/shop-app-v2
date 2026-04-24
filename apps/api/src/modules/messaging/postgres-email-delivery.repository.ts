import { emailDeliveryAttempts } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailDeliveryRecorder } from "./email-service.types.js";

export class PostgresEmailDeliveryRepository implements EmailDeliveryRecorder {
  constructor(private readonly db: ApiDatabase) {}

  async recordAttempt(
    input: Parameters<EmailDeliveryRecorder["recordAttempt"]>[0],
  ): Promise<{ attemptId: string | null }> {
    const [row] = await this.db
      .insert(emailDeliveryAttempts)
      .values({
        createdAt: input.createdAt,
        failureReason: input.failureReason ?? null,
        messageType: input.messageType,
        provider: input.provider,
        providerMessageId: input.providerMessageId ?? null,
        recipientEmail: input.recipientEmail,
        status: input.status,
        subject: input.subject,
      })
      .returning({ id: emailDeliveryAttempts.id });

    return { attemptId: row?.id ?? null };
  }
}
