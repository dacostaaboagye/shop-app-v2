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
  logger?: Pick<Console, "error" | "warn">;
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

// Reject webhooks whose timestamp is outside this window, regardless of
// signature validity. The signature alone proves the secret was used; the
// timestamp window proves the event is recent and not a replay.
const WEBHOOK_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

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

    const verifiedJson = this.verifyPayload(
      input.payload,
      input.headers,
      secret,
    );

    // Dead-letter on schema mismatch: log + return so the route can send
    // 200 OK. Resend retries 5xx responses, which would hammer the API on
    // a persistently malformed payload (e.g. a Resend-side schema change).
    const parseResult = resendEmailEventSchema.safeParse(verifiedJson);
    if (!parseResult.success) {
      this.dependencies.logger?.error(
        "[email-webhook] Resend payload failed schema validation",
        {
          error: parseResult.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
          eventId: input.headers.id,
        },
      );
      return { duplicate: false, processed: false };
    }
    const verifiedPayload = parseResult.data;
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

    // Replay guard: reject events whose timestamp is outside ±5 minutes of
    // server time. Signature verification alone proves the secret was used
    // at some point — without a window, an attacker who captured an old
    // bounce event can replay it to suppress the recipient indefinitely.
    const timestampMs = parseSvixTimestamp(timestamp);
    if (
      timestampMs === null ||
      Math.abs(this.dependencies.now().getTime() - timestampMs) >
        WEBHOOK_TIMESTAMP_WINDOW_MS
    ) {
      throw new AppError({
        code: "unauthorized",
        detail: "Webhook timestamp is outside the accepted replay window.",
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

/**
 * Svix timestamp headers are seconds-since-epoch as a string. Returns
 * milliseconds for direct comparison with `Date.now()`, or null if the
 * value is not a finite integer string.
 */
function parseSvixTimestamp(value: string): number | null {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return null;
  return Math.trunc(seconds * 1000);
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
