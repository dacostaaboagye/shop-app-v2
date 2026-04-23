import { Resend } from "resend";
import { z } from "zod";
import { AppError } from "../_core/errors/app-error.js";
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
  now: () => Date;
  verifier?: (input: {
    headers: { id: string; signature: string; timestamp: string };
    payload: string;
    webhookSecret: string;
  }) => unknown;
  webhookSecret?: string;
  statusRepository: {
    findAttemptIdByProviderMessageId(
      providerMessageId: string,
    ): Promise<string | null>;
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
  private readonly resend = new Resend("webhook-verifier");

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

    const attemptId =
      await this.dependencies.statusRepository.findAttemptIdByProviderMessageId(
        verifiedPayload.data.email_id,
      );
    const statusReason = deriveStatusReason(verifiedPayload);
    const result = await this.dependencies.statusRepository.recordStatusEvent({
      attemptId,
      occurredAt: new Date(verifiedPayload.created_at),
      provider: "resend",
      providerEventId: input.headers.id ?? "",
      providerEventType: verifiedPayload.type,
      providerMessageId: verifiedPayload.data.email_id,
      receivedAt: this.dependencies.now(),
      status: mappedStatus,
      ...(statusReason ? { statusReason } : {}),
    });

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
    return this.resend.webhooks.verify(input);
  }
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
