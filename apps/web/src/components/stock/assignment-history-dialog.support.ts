import type { AssignmentHistoryEvent } from "@shop/contracts";
import { toRoute } from "@/lib/routes";

const EVENT_LABELS: Record<AssignmentHistoryEvent["eventType"], string> = {
  assigned: "Assigned",
  cancelled: "Cancelled",
  handover_in: "Handover received",
  handover_out: "Handover sent",
  reassigned: "Reassigned",
  reverted: "Reverted",
};

export function formatAssignmentHistoryEventLabel(
  eventType: AssignmentHistoryEvent["eventType"],
) {
  return EVENT_LABELS[eventType];
}

export function buildManagerStockMovementHref(input: {
  locationSlug: string;
  sku: string;
}) {
  const params = new URLSearchParams({
    location: input.locationSlug,
    sku: input.sku,
  });
  return toRoute(`/manager/stock/movements?${params.toString()}`);
}
