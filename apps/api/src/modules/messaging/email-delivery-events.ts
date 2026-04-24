import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";
import type { EmailDeliveryStatus } from "./email-service.types.js";

type EmailDeliveryIssueEventInput = {
  attempt: {
    messageType: string;
    recipientEmail: string;
    subject: string;
  } | null;
  occurredAt: Date;
  providerMessageId: string;
  status: EmailDeliveryStatus;
  statusReason?: string | null;
};

export function createEmailDeliveryIssueEvent(
  input: EmailDeliveryIssueEventInput,
): PlatformEventRecord {
  const subject = input.attempt?.subject ?? "Transactional email";
  const recipientEmail = input.attempt?.recipientEmail ?? "unknown recipient";

  return {
    actor: { userSlug: "system" },
    audience: [{ kind: "permission", permission: "settings.documents.view" }],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: {
      messageType: input.attempt?.messageType ?? null,
      providerMessageId: input.providerMessageId,
      recipientEmail: input.attempt?.recipientEmail ?? null,
      status: input.status,
      statusReason: input.statusReason ?? null,
      subject: input.attempt?.subject ?? null,
    },
    resource: {
      kind: "email_delivery",
      reference: input.providerMessageId,
    },
    summary: buildEmailDeliveryIssueSummary({
      recipientEmail,
      status: input.status,
      statusReason: input.statusReason ?? null,
      subject,
    }),
    type: `messaging.email.${input.status}`,
  };
}

function buildEmailDeliveryIssueSummary(input: {
  recipientEmail: string;
  status: EmailDeliveryStatus;
  statusReason: string | null;
  subject: string;
}) {
  const base = `${formatEmailStatus(input.status)} for "${input.subject}" to ${input.recipientEmail}.`;

  return input.statusReason ? `${base} ${input.statusReason}` : base;
}

function formatEmailStatus(status: EmailDeliveryStatus) {
  switch (status) {
    case "bounced":
      return "Email bounced";
    case "complained":
      return "Recipient complained about email";
    case "failed":
      return "Email delivery failed";
    case "suppressed":
      return "Email was suppressed";
    default:
      return `Email status changed to ${status.replaceAll("_", " ")}`;
  }
}
