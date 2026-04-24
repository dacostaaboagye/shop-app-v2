export type OwnershipResolutionReason =
  | "cancelled_owner_event"
  | "handover_without_receiver";

type OwnershipResolutionEvent = {
  eventType:
    | "assigned"
    | "reassigned"
    | "handover_out"
    | "handover_in"
    | "reverted"
    | "cancelled";
  workerId: string;
};

export type OwnershipResolution =
  | { status: "owned"; workerId: string }
  | { reason: OwnershipResolutionReason; status: "unowned" };

export function resolveOwnerFromEvent(
  event: OwnershipResolutionEvent,
): OwnershipResolution {
  switch (event.eventType) {
    case "cancelled":
      return {
        reason: "cancelled_owner_event",
        status: "unowned",
      };
    case "handover_out":
      return {
        reason: "handover_without_receiver",
        status: "unowned",
      };
    default:
      return {
        status: "owned",
        workerId: event.workerId,
      };
  }
}
