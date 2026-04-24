import type { BlockedEmailDeliveryStatus } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { EmailDeliveryStatus } from "./email-service.types.js";
import type { RecipientDeliveryLifecycleState } from "./postgres-email-recipient-delivery-state.repository.js";

const blockedStatuses = new Set<BlockedEmailDeliveryStatus>([
  "bounced",
  "complained",
  "suppressed",
]);

type RecipientDeliveryStateLookup = {
  findLatestLifecycleState(
    recipientEmail: string,
  ): Promise<RecipientDeliveryLifecycleState | null>;
};

export class EmailDeliveryPolicy {
  constructor(
    private readonly recipientStateLookup: RecipientDeliveryStateLookup,
  ) {}

  async assertCanSend(recipientEmail: string): Promise<void> {
    const latestState =
      await this.recipientStateLookup.findLatestLifecycleState(recipientEmail);

    if (!latestState || !isBlockedStatus(latestState.status)) {
      return;
    }

    const blockedState = {
      ...latestState,
      status: latestState.status,
    };

    throw new AppError({
      code: "conflict",
      statusCode: 409,
      title: "Email delivery blocked",
      detail: buildBlockedDeliveryDetail(recipientEmail, blockedState),
      details: {
        occurredAt: blockedState.occurredAt.toISOString(),
        recipientEmail,
        ...(blockedState.statusReason
          ? { statusReason: blockedState.statusReason }
          : {}),
        status: blockedState.status,
      },
    });
  }
}

function isBlockedStatus(
  status: EmailDeliveryStatus,
): status is BlockedEmailDeliveryStatus {
  return blockedStatuses.has(status as BlockedEmailDeliveryStatus);
}

function buildBlockedDeliveryDetail(
  recipientEmail: string,
  latestState: RecipientDeliveryLifecycleState & {
    status: BlockedEmailDeliveryStatus;
  },
): string {
  const reason = formatBlockedReason(latestState.status);
  const reasonSuffix = latestState.statusReason
    ? ` Latest provider detail: ${latestState.statusReason}.`
    : "";

  return `${recipientEmail} cannot receive email right now because ${reason}. Review the address and provider state before retrying.${reasonSuffix}`;
}

function formatBlockedReason(status: BlockedEmailDeliveryStatus): string {
  switch (status) {
    case "bounced":
      return "the address previously bounced";
    case "complained":
      return "the recipient previously complained about email from this app";
    case "suppressed":
      return "the provider has suppressed the address";
  }
}
