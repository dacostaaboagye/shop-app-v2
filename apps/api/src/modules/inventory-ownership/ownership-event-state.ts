import type { OwnershipEventType } from "./ownership-query.service.js";

export function isActiveHandoverEvent(eventType: OwnershipEventType): boolean {
  return eventType === "handover_in" || eventType === "handover_out";
}
