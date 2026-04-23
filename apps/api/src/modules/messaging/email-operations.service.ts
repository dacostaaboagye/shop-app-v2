import type { EmailOperationsResponse } from "@shop/contracts";
import type { EmailService } from "./email.service.js";
import type { EmailTemplateProvider } from "./email-service.types.js";
import type { EmailDeliveryAttemptRow } from "./postgres-email-delivery-query.repository.js";

type EmailOperationsDependencies = {
  emailService: Pick<EmailService, "sendTestEmail">;
  providerConfigured: boolean;
  recentAttemptLimit: number;
  templateProvider: EmailTemplateProvider;
  attemptsRepository: {
    listRecentAttempts(limit: number): Promise<EmailDeliveryAttemptRow[]>;
  };
};

export class EmailOperationsService {
  constructor(private readonly dependencies: EmailOperationsDependencies) {}

  async getOperationsOverview(input: {
    now: Date;
  }): Promise<EmailOperationsResponse> {
    const [configuration, recentAttempts] = await Promise.all([
      this.dependencies.templateProvider.getEmailTemplateSettings(),
      this.dependencies.attemptsRepository.listRecentAttempts(
        this.dependencies.recentAttemptLimit,
      ),
    ]);

    return {
      fromAddress: configuration.sender.fromAddress,
      generatedAt: input.now.toISOString(),
      mode: this.dependencies.providerConfigured
        ? "live_send"
        : "console_fallback",
      providerConfigured: this.dependencies.providerConfigured,
      recentAttempts: recentAttempts.map((attempt) => ({
        createdAt: attempt.createdAt.toISOString(),
        failureReason: attempt.failureReason,
        messageType: attempt.messageType,
        provider: attempt.provider,
        providerMessageId: attempt.providerMessageId,
        recipientEmail: attempt.recipientEmail,
        status: attempt.status,
        statusRecordedAt: attempt.statusRecordedAt.toISOString(),
        subject: attempt.subject,
      })),
      replyToAddress: configuration.sender.replyToAddress,
      supportEmail: configuration.sender.supportEmail,
    };
  }

  async sendTestEmail(input: { targetEmail: string }): Promise<void> {
    await this.dependencies.emailService.sendTestEmail({
      to: input.targetEmail,
    });
  }
}
