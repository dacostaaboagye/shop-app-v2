import { Resend } from "resend";
import { z } from "zod";
import { AppError } from "../_core/errors/app-error.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { createEmailDeliveryIssueEvent } from "./email-delivery-events.js";
import type { EmailDeliveryStatus } from "./email-service.types.js";

const resendEmailEventSchema = z.object({
  created_at: z.iso.datetime(),
  data: z.object({
    bounce: z
      .object({
        message: z.string().optional(),
        subType: z.string().optional(),
        type: z.string().optional(),
      })
      .optional(),
    email_id: z.string().min(1),
  }),
  type: z.string().min(1),
});

type ResendWebhookDependencies = {
  eventPublisher?: Pick<PlatformEventPublisher, "publish">;
  now: () => Date;
  verifier?: (input: {
    headers: { id: string; signature: string; timestamp: string };
    payload: string;
    webhookSecret: string;
  }) => unknown;
  webhookSecret?: string;
  statusRepository: {
    findAttemptByProviderMessageId(providerMessageId: string): Promise<{
      id: string;
      messageType: string;
      recipientEmail: string;
      subject: string;
    } | null>;
    recordStatusEvent(input: {
      attemptId: string | null;
      occurredAt: Date;
      provider: "resend";
      providerEventId: string;
      providerEventType: string;
      providerMessageId: string;
      receivedAt: Date;
      status: EmailDeliveryStatus;
      statusReason?: string | null;
    }): Promise<{ inserted: boolean }>;
  };
};

export class ResendEmailWebhookService {
  constructor(private readonly dependencies: ResendWebhookDependencies) {}

  async handleWebhook(input: {
    payload: string;
    headers: {
      id: string | undefined;
      signature: string | undefined;
      timestamp: string | undefined;
    };
  }): Promise<{ duplicate: boolean; processed: boolean }> {
    const secret = this.dependencies.webhookSecret;

    if (!secret) {
      throw new AppError({
        code: "internal_error",
        detail:
          "RESEND_WEBHOOK_SECRET must be configured to process email webhooks.",
        statusCode: 503,
        title: "Webhook secret missing",
      });
    }

    const verifiedPayload = resendEmailEventSchema.parse(
      this.verifyPayload(input.payload, input.headers, secret),
    );
    const mappedStatus = mapResendEventTypeToDeliveryStatus(
      verifiedPayload.type,
    );

    if (!mappedStatus) {
      return { duplicate: false, processed: false };
    }

    const attempt =
      await this.dependencies.statusRepository.findAttemptByProviderMessageId(
        verifiedPayload.data.email_id,
      );
    const statusReason = deriveStatusReason(verifiedPayload);
    const result = await this.dependencies.statusRepository.recordStatusEvent({
      attemptId: attempt?.id ?? null,
      occurredAt: new Date(verifiedPayload.created_at),
      provider: "resend",
      providerEventId: input.headers.id ?? "",
      providerEventType: verifiedPayload.type,
      providerMessageId: verifiedPayload.data.email_id,
      receivedAt: this.dependencies.now(),
      status: mappedStatus,
      ...(statusReason ? { statusReason } : {}),
    });

    if (result.inserted && shouldPublishIssueEvent(mappedStatus)) {
      await this.dependencies.eventPublisher?.publish(
        createEmailDeliveryIssueEvent({
          attempt,
          occurredAt: this.dependencies.now(),
          providerMessageId: verifiedPayload.data.email_id,
          reference: verifiedPayload.data.email_id,
          status: mappedStatus,
          ...(statusReason ? { statusReason } : {}),
        }),
      );
    }

    return {
      duplicate: !result.inserted,
      processed: result.inserted,
    };
  }

  private verifyPayload(
    payload: string,
    headers: {
      id: string | undefined;
      signature: string | undefined;
      timestamp: string | undefined;
    },
    webhookSecret: string,
  ) {
    const id = headers.id?.trim();
    const timestamp = headers.timestamp?.trim();
    const signature = headers.signature?.trim();

    if (!id || !timestamp || !signature) {
      throw new AppError({
        code: "unauthorized",
        detail: "Resend webhook signature headers are required.",
        statusCode: 401,
        title: "Invalid webhook signature",
      });
    }

    try {
      return (this.dependencies.verifier ?? this.defaultVerify).call(this, {
        headers: { id, signature, timestamp },
        payload,
        webhookSecret,
      });
    } catch {
      throw new AppError({
        code: "unauthorized",
        detail: "The webhook signature could not be verified.",
        statusCode: 401,
        title: "Invalid webhook signature",
      });
    }
  }

  private defaultVerify(input: {
    headers: { id: string; signature: string; timestamp: string };
    payload: string;
    webhookSecret: string;
  }) {
    return verifyResendWebhook(input);
  }
}

function shouldPublishIssueEvent(status: EmailDeliveryStatus) {
  return (
    status === "bounced" ||
    status === "complained" ||
    status === "failed" ||
    status === "suppressed"
  );
}

function mapResendEventTypeToDeliveryStatus(
  type: string,
): EmailDeliveryStatus | null {
  switch (type) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delayed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    case "email.suppressed":
      return "suppressed";
    default:
      return null;
  }
}

function deriveStatusReason(
  payload: z.infer<typeof resendEmailEventSchema>,
): string | null {
  if (payload.type !== "email.bounced") {
    return null;
  }

  const bounce = payload.data.bounce;
  if (!bounce) {
    return null;
  }

  return [bounce.type, bounce.subType, bounce.message]
    .filter((part) => Boolean(part && part.trim() !== ""))
    .join(" - ");
}

function verifyResendWebhook(input: {
  headers: { id: string; signature: string; timestamp: string };
  payload: string;
  webhookSecret: string;
}): unknown {
  // Resend SDK requires a constructor argument but webhook verification
  // uses only the webhookSecret param passed to .verify() — the API key
  // is irrelevant here and is not used.
  return new Resend("verify-only").webhooks.verify(input);
}
