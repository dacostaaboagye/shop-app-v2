import type { DeliveryStatus } from "@shop/contracts";

const TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  draft: ["assigned", "cancelled"],
  assigned: ["in_transit", "cancelled"],
  in_transit: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export type TransitionVerdict =
  | { allowed: true }
  | { allowed: false; reason: "illegal_transition" | "terminal_state" };

export function canTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
): TransitionVerdict {
  const allowed = TRANSITIONS[from];
  if (allowed.length === 0) {
    return { allowed: false, reason: "terminal_state" };
  }
  if (!allowed.includes(to)) {
    return { allowed: false, reason: "illegal_transition" };
  }
  return { allowed: true };
}

export function getAllowedNextStates(
  from: DeliveryStatus,
): readonly DeliveryStatus[] {
  return TRANSITIONS[from];
}

export function isTerminalStatus(status: DeliveryStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
