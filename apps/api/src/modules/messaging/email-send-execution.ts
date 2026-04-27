import { AppError } from "../_core/errors/app-error.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { createEmailDeliveryIssueEvent } from "./email-delivery-events.js";
import { emailDeliveryError } from "./email-errors.js";
import type {
  EmailDeliveryRecorder,
  EmailOptions,
  EmailSendResult,
  EmailTransport,
} from "./email-service.types.js";

type ExecutionDependencies = {
  allowConsoleFallback: boolean;
  deliveryRecorder: EmailDeliveryRecorder | null;
  eventPublisher?: Pick<PlatformEventPublisher, "publish">;
  fromAddress: string;
  logger: Pick<Console, "error" | "log">;
  transport: EmailTransport | null;
};

export class EmailSendExecution {
  constructor(private readonly deps: ExecutionDependencies) {}

  async send(options: EmailOptions): Promise<EmailSendResult> {
    if (!this.deps.transport) {
      this.deps.logger.log(
        `[EMAIL] To: ${options.to} | Subject: ${options.subject}`,
      );
      this.deps.logger.log(`[EMAIL] Text: ${options.text}`);
      const recorded = await this.recordDelivery({
        messageType: options.messageType,
        provider: "console",
        recipientEmail: options.to,
        status: "console_fallback",
        subject: options.subject,
      });
      return {
        attemptId: recorded.attemptId,
        status: "console_fallback",
      };
    }

    try {
      const { data, error } = await this.deps.transport.send({
        ...(options.attachments ? { attachments: options.attachments } : {}),
        from: this.deps.fromAddress,
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        const recorded = await this.recordDelivery({
          failureReason: error.message ?? "Provider rejected the message.",
          messageType: options.messageType,
          provider: "resend",
          recipientEmail: options.to,
          status: "failed",
          subject: options.subject,
        });
        this.deps.logger.error("[email] Provider rejected message.", {
          error: error.message,
          subject: options.subject,
          to: options.to,
        });
        await this.publishFailureEvent({
          attemptId: recorded.attemptId,
          failureReason: error.message ?? "Provider rejected the message.",
          options,
        });
        throw emailDeliveryError({
          attemptId: recorded.attemptId,
          failureReason: error.message ?? "Provider rejected the message.",
          status: "failed",
        });
      }

      const recorded = await this.recordDelivery({
        messageType: options.messageType,
        provider: "resend",
        providerMessageId: data?.id ?? null,
        recipientEmail: options.to,
        status: "sent",
        subject: options.subject,
      });
      return {
        attemptId: recorded.attemptId,
        providerMessageId: data?.id ?? null,
        status: "sent",
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const recorded = await this.recordDelivery({
        failureReason: error instanceof Error ? error.message : String(error),
        messageType: options.messageType,
        provider: "resend",
        recipientEmail: options.to,
        status: "failed",
        subject: options.subject,
      });
      this.deps.logger.error("[email] Provider request failed.", {
        error: error instanceof Error ? error.message : String(error),
        subject: options.subject,
        to: options.to,
      });
      await this.publishFailureEvent({
        attemptId: recorded.attemptId,
        failureReason: error instanceof Error ? error.message : String(error),
        options,
      });
      throw emailDeliveryError({
        attemptId: recorded.attemptId,
        failureReason: error instanceof Error ? error.message : String(error),
        status: "failed",
      });
    }
  }

  private async recordDelivery(
    input: Omit<
      Parameters<EmailDeliveryRecorder["recordAttempt"]>[0],
      "createdAt"
    >,
  ): Promise<{ attemptId: string | null }> {
    if (!this.deps.deliveryRecorder) return { attemptId: null };
    try {
      const result = await this.deps.deliveryRecorder.recordAttempt({
        ...input,
        createdAt: new Date(),
      });
      return result ?? { attemptId: null };
    } catch (error) {
      this.deps.logger.error("[email] Failed to record delivery attempt.", {
        error: error instanceof Error ? error.message : String(error),
        messageType: input.messageType,
        provider: input.provider,
        status: input.status,
        to: input.recipientEmail,
      });
      return { attemptId: null };
    }
  }

  private async publishFailureEvent(input: {
    attemptId: string | null;
    failureReason: string;
    options: EmailOptions;
  }): Promise<void> {
    const reference =
      input.attemptId ??
      `send_failure:${input.options.messageType}:${input.options.to}`;

    try {
      await this.deps.eventPublisher?.publish(
        createEmailDeliveryIssueEvent({
          attempt: {
            attemptId: input.attemptId,
            messageType: input.options.messageType,
            recipientEmail: input.options.to,
            subject: input.options.subject,
          },
          occurredAt: new Date(),
          reference,
          status: "failed",
          statusReason: input.failureReason,
        }),
      );
    } catch (error) {
      this.deps.logger.error(
        "[email] Failed to publish delivery issue event.",
        {
          error: error instanceof Error ? error.message : String(error),
          messageType: input.options.messageType,
          reference,
          to: input.options.to,
        },
      );
    }
  }
}
