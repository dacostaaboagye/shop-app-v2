import type { EmailRecipientStateResponse } from "@shop/contracts";

export function canSendToRecipient(
  state: Pick<EmailRecipientStateResponse, "canSend"> | null | undefined,
) {
  return state?.canSend !== false;
}

export function formatBlockedRecipientStatus(status: string | null) {
  switch (status) {
    case "bounced":
      return "Bounced";
    case "complained":
      return "Complained";
    case "suppressed":
      return "Suppressed";
    default:
      return "Blocked";
  }
}
