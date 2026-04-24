import type {
  BlockedEmailDeliveryStatus,
  EmailOperationsResponse,
  EmailRecipientStateResponse,
} from "@shop/contracts";
import type { EmailService } from "./email.service.js";
import type { EmailTemplateProvider } from "./email-service.types.js";
import type { EmailDeliveryAttemptRow } from "./postgres-email-delivery-query.repository.js";
import type { RecipientDeliveryLifecycleState } from "./postgres-email-recipient-delivery-state.repository.js";

type EmailOperationsDependencies = {
  emailService: Pick<EmailService, "sendTestEmail">;
  providerConfigured: boolean;
  recentAttemptLimit: number;
  recipientStateRepository: {
    findLatestLifecycleState(
      recipientEmail: string,
    ): Promise<RecipientDeliveryLifecycleState | null>;
  };
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

  async getRecipientState(input: {
    recipientEmail: string;
  }): Promise<EmailRecipientStateResponse> {
    const latestState =
      await this.dependencies.recipientStateRepository.findLatestLifecycleState(
        input.recipientEmail,
      );

    if (!latestState || !isBlockedStatus(latestState.status)) {
      return {
        canSend: true,
        occurredAt: null,
        recipientEmail: input.recipientEmail,
        status: null,
        statusReason: null,
        summary:
          "No blocked provider lifecycle state is recorded for this recipient.",
      };
    }

    return {
      canSend: false,
      occurredAt: latestState.occurredAt.toISOString(),
      recipientEmail: input.recipientEmail,
      status: latestState.status,
      statusReason: latestState.statusReason,
      summary: buildRecipientStateSummary(latestState.status),
    };
  }
}

function isBlockedStatus(
  status: RecipientDeliveryLifecycleState["status"],
): status is BlockedEmailDeliveryStatus {
  return (
    status === "bounced" || status === "complained" || status === "suppressed"
  );
}

function buildRecipientStateSummary(status: BlockedEmailDeliveryStatus) {
  switch (status) {
    case "bounced":
      return "This address previously bounced. Confirm the address before retrying.";
    case "complained":
      return "This recipient previously complained about email from the app. Do not resend until support reviews it.";
    case "suppressed":
      return "This address is currently suppressed by the provider. Resolve the suppression before retrying.";
  }
}
